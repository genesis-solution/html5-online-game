const jwt = require('jsonwebtoken');
const { secretKey } = require('../config/config');

function authenticateToken(req, res, next) {
  let token = req.headers['authorization'];

  if (token == null) token = req.query.authorization;
  if (token == null) return res.redirect('/');

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.redirect('/');
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
