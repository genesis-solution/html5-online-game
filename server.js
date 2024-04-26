const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { routes } = require('./route/routes');
const { handleSocketEvents } = require('./gameLogic');
const { serverPort } = require('./config/config');

const app = express();
const server = http.createServer(app);

const io = socketIo(server);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
// Initialize routes
app.use('/', routes(io));


handleSocketEvents(io);
// Start server
server.listen(serverPort, () => {
  console.log(`Server is running on http://localhost:${serverPort}`);
});
