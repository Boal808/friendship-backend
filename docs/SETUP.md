# Setup

[yarn](https://github.com/yarnpkg/yarn) 0.18+ must be present on your machine.

## Install project dependencies
```
$ yarn
```

## Install PostgreSQL

Look up instructions for your specific OS/distribution.

## Initialize DB
```
$ psql --user postgres
  CREATE DATABASE backendkit;
  \q

$ yarn db:migrate
```

## Insert seed data
```
$ yarn db:seed
```

## Register admin user (production environments)
```
# Get URL from e.g. Heroku dashboard
$ DATABASE_URL=postgres://user:pass@hostname/dbname yarn register:admin
```

## Set secret used for generating JWT tokens (production environments)
```
# Backend will refuse to run if NODE_ENV=production and this is not set:
$ export SECRET=[secret-string]
```

In Heroku, you can:
```
$ heroku config:set SECRET=[secret-string]
```

You may also use [dotenv](https://www.npmjs.com/package/dotenv) files if you wish.

Recommendation for generating `[secret-string]`:
```
$ node -e "console.log(require('crypto').randomBytes(256).toString('base64'));"
```

## Run backend
```
$ yarn start
```

Backend is now listening on port 3888 (or `$PORT` if set)

## Run backend in development, watching for changes
```
$ yarn watch
```