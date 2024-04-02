const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { loginRoutes, gameRoutes } = require('../userRoutes');
const { authenticateToken } = require('../middleware/middlewares');

function routes(io) {
  const app = express();

  // Middleware
  app.use(bodyParser.json());
  app.use(session({
    secret: 'testkey123',
    resave: false,
    saveUninitialized: true
  }));

  // Routes
  app.use('/', loginRoutes);
  app.use('/', authenticateToken, gameRoutes);

  return app;
}

module.exports = { routes };
