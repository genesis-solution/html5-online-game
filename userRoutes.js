const express = require('express');
const { login, register, result, logout, generateJWTtoken, getUserInfo, getBotInfo, setLog, getCurrentTime } = require('./route/controllers');
const cors = require('cors');
const { authenticateToken } = require('./middleware/middlewares');

const loginRoutes = express.Router();
const gameRoutes = express.Router();

// Enable CORS for all routes
loginRoutes.use(cors());
gameRoutes.use(cors());
// Login routes
loginRoutes.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});
loginRoutes.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});
loginRoutes.post('/login', login);
loginRoutes.post('/register', register);
loginRoutes.post('/logout', logout);
loginRoutes.get('/generateJWTtoken', generateJWTtoken);
// Endpoint to serve user's information (username)
gameRoutes.get('/user/info', getUserInfo);

gameRoutes.get('/bot/info', getBotInfo);
// Endpoint to serve current time
gameRoutes.get('/currenttime', getCurrentTime);

loginRoutes.get('/log', setLog);

// Game routes
gameRoutes.get('/game', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
loginRoutes.post('/result', result); // Add result endpoint here

module.exports = { loginRoutes, gameRoutes };
