import Boom from 'boom';

import { resizeImage } from '../utils/image';
import { createToken, hashPassword } from '../utils/auth';
import {
  dbGetUsers,
  dbGetUser,
  dbDelUser,
  dbUpdateUser,
  dbCreateUser,
  dbGetEmailVerification,
  dbDelVerificationHash,
} from '../models/users';


export const getUsers = (request, reply) => dbGetUsers().then(reply);
export const getUser = (request, reply) =>
  dbGetUser(request.params.userId).then(reply);

export const delUser = (request, reply) => {
  if (
    request.pre.user.scope !== 'admin' &&
    request.pre.user.id !== request.params.userId
  ) {
    return reply(
      Boom.unauthorized('Unprivileged users can only delete own userId!'),
    );
  }

  return dbDelUser(request.params.userId).then(reply);
};

export const updateUser = async (request, reply) => {
  if (
    request.pre.user.scope !== 'admin' &&
    request.pre.user.id !== request.params.userId
  ) {
    return reply(
      Boom.unauthorized(
        'Unprivileged users can only perform updates on own userId!',
      ),
    );
  }

  const fields = {
    email: request.payload.email,
    description: request.payload.description,
    image: request.payload.image,
  };

  // Only admins are allowed to modify user scope
  if (request.pre.user.scope === 'admin') {
    fields.scope = request.payload.scope;
  }

  // If request contains an image, resize it to max 512x512 pixels
  if (fields.image) {
    const buf = Buffer.from(fields.image, 'base64');
    await resizeImage(buf).then(resized => (fields.image = resized));
  }

  return dbUpdateUser(request.params.userId, fields).then(reply);
};

export const authUser = (request, reply) =>
  reply(
    createToken({
      id: request.pre.user.id,
      email: request.pre.user.email,
      scope: 'user',
    }),
  );

export const registerUser = (request, reply) =>
  hashPassword(request.payload.password)
    .then(passwordHash =>
      dbCreateUser({
        ...request.payload,
        email: request.payload.email.toLowerCase().trim(),
        password: passwordHash,
        scope: 'user',
      }).then(reply),
    )
    .catch((err) => {
      if (err.constraint === 'users_email_unique') {
        reply(Boom.conflict('Account already exists'));
      } else {
        reply(Boom.badImplementation(err));
      }
    });

//check if the hash value exists in the db
//and verify the user that matches (active=true)
export const verifyUser = (request, reply) => {
  dbGetEmailVerification(request.params.hash)
    .then((data) => {
      const fields = {
        active: true,
      };
      dbDelVerificationHash(data.ownerId).then(() =>
        dbUpdateUser(data.ownerId, fields).then(reply),
      ).catch(() => reply(Boom.conflict('This verification link is expired')));
    }).catch(() => {
      reply(Boom.conflict('This verification link is expired'));
    });
};

