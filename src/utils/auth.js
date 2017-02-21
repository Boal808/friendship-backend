import Boom from 'boom';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import config from './config';
import knex from './db';

const bearerRegex = /(Bearer\s+)*(.*)/i;

// Check that a decoded JWT contains all required fields
export const validateJwt = (decoded, request, callback) => {
  const invalidToken = !decoded.id || !decoded.email || !decoded.scope;

  if (invalidToken) {
    callback(new Error('JWT is missing some fields and not valid! Please log out and in again.'), false);
  } else {
    callback(null, true);
  }
};

// Hapi pre handler which fetches all fields from JWT
export const bindUserData = (request, reply) => {
  const authHeader = request.headers.authorization;

  // strip "Bearer" word from header if present
  const token = authHeader.match(bearerRegex)[2];
  const decoded = jwt.decode(token);

  reply(decoded);
};

// Hapi route config which makes sure user has authenticated with `scope`
export const getAuthWithScope = scope => ({
  auth: { strategy: 'jwt', scope },
  pre: [{ method: bindUserData, assign: scope }],
});

// Verify credentials for user with `scope`. DB table name is assumed to == value of given `scope`
// with an 's' appended (plural form).
export const verifyCredentials = scope => ({ payload: { email, password } }, reply) => (
  knex(`${scope}s`)
    .first()
    .where({ email })
    .then(((user) => {
      if (!user) {
        throw new Error(`User with email ${email} not found in database`);
      }

      bcrypt.compare(password, user.password, (err, isValid) => {
        if (isValid) {
          reply(user);
        } else {
          throw new Error(`Incorrect password attempt by user with email ${email}`);
        }
      });
    }))
    .catch(() => {
      reply(Boom.unauthorized('Incorrect email or password!'));
    })
);

// Hapi route config which performs authentication with `scope`
export const doAuthWithScope = scope => ({
  validate: {
    payload: {
      email: Joi.string().required(),
      password: Joi.string().required(),
    },
    failAction: (request, reply) => {
      reply(Boom.unauthorized('Incorrect email or password!'));
    },
  },
  pre: [
    { method: verifyCredentials(scope), assign: scope },
  ],
});

// Create a new JWT for user with `email` and `scope`
export const createToken = (email, scope) => ({
  token: jwt.sign({ email, scope }, config.auth.secret, config.auth.options),
});

// Return promise which resolves to hash of given password
export const hashPassword = password => (
  new Promise((resolve, reject) => {
    bcrypt.genSalt(config.auth.saltRounds, (saltErr, salt) => {
      if (saltErr) {
        reject(saltErr);
      }
      bcrypt.hash(password, salt, (hashErr, hash) => {
        if (hashErr) {
          reject(hashErr);
        } else {
          resolve(hash);
        }
      });
    });
  })
);