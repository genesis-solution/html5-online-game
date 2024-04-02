const { authenticateToken } = require('./middleware/middlewares');
const { loginRoutes, gameRoutes } = require('./userRoutes');
const { getConnectionFromPool, queryDatabase } = require('./config/database');

let totalPlayers = [];
let waitingPlayers = []; // Store players waiting to be matched
let rooms = {}; // Store game rooms

function handleSocketEvents(io) {

    io.on('connection', (socket) => {
        console.log('New client connected');

        // Handle joinGame event
        socket.on('joinGame', (playerName) => {
            if (!isNameTaken(playerName) && !isRoomTaken(playerName) && !isNameTakenFromTotalPlayers(playerName)) {
                // If the name is not taken, proceed
                socket.playerName = playerName; // Store the player's name in the socket object
                waitingPlayers.push(socket); // Add the player to the waiting list
                totalPlayers.push(socket);

                // Try to match players when there are at least two waiting
                if (waitingPlayers.length >= 2) {
                    const player1 = waitingPlayers.shift();
                    const player2 = waitingPlayers.shift();

                    const date = new Date();
                    const roomName = `Room-${date.getTime()}`;
                    console.log("created room", roomName)
                    rooms[roomName] = {
                        player1: { id: player1.id, name: player1.playerName },
                        player2: { id: player2.id, name: player2.playerName }
                    };

                    player1.join(roomName);
                    player2.join(roomName);

                    // Inform clients they joined the room
                    player1.emit('joinedRoom', roomName);
                    player2.emit('joinedRoom', roomName);

                    // Inform clients the game started
                    io.to(roomName).emit('startGamebySocket', [player1.playerName, player2.playerName]);
                }
            } else {
                // Inform client that the name is already taken
                socket.emit('nameTaken');
            }
        });

        // Handle player moves
        socket.on('move', (moveData) => {
            const roomName = findRoomBySocketId(socket.id);
            if (roomName) {
                // Broadcast move to the other player in the room
                socket.to(roomName).emit('opponentMove', moveData);
            }
        });

        socket.on('updatetimer', (timer) => {
            const roomName1 = findRoomBySocketId(socket.id);
            if (roomName1) {
            for (const roomName in rooms) {
                if (rooms.hasOwnProperty(roomName)) {
                    const room = rooms[roomName];
                    if (room.player1.id === socket.id || room.player2.id === socket.id) {
                        io.to(room.player1.id).emit('updatetimer', timer);
                        io.to(room.player2.id).emit('updatetimer', timer);
                    }
                }
            }
            }
        });

        socket.on('giveup', (playerName) => {
            const roomName1 = findRoomBySocketId(socket.id);
            if (roomName1) {
            for (const roomName in rooms) {
                if (rooms.hasOwnProperty(roomName)) {
                    const room = rooms[roomName];
                    if (room.player1.id === socket.id || room.player2.id === socket.id) {
                        io.to(room.player1.id).emit('giveup', playerName);
                        io.to(room.player2.id).emit('giveup', playerName);
                    }
                }
            }
            }
        });

        socket.on('toggleuser', (status) => {
            const roomName1 = findRoomBySocketId(socket.id);
            if (roomName1) {
                // Broadcast move to the other player in the room
                for (const roomName in rooms) {
                if (rooms.hasOwnProperty(roomName)) {
                    const room = rooms[roomName];
                    if (room.player1.id === socket.id || room.player2.id === socket.id) {
                        io.to(room.player1.id).emit('toggleuser', status);
                        io.to(room.player2.id).emit('toggleuser', status);
                    }
                }
            }
            }
        });

        socket.on('beforeautogame', () => {
            const roomName = findRoomBySocketId(socket.id);
            const index = waitingPlayers.indexOf(socket);
            if (index !== -1) {
                waitingPlayers.splice(index, 1);
            }

            console.log("Players count: ", totalPlayers.length)

            if (roomName) {
                // Inform the other player in the room about disconnection
                socket.to(roomName).emit('playerDisconnected', roomName);
                // Remove the room
                console.log("disconnected", roomName)
                delete rooms[roomName];
            }
        });

        socket.on('disconnect', () => {
            const roomName = findRoomBySocketId(socket.id);

            const index = waitingPlayers.indexOf(socket);
            if (index !== -1) {
                waitingPlayers.splice(index, 1);
            }

            const index2 = totalPlayers.indexOf(socket);
            if (index2 !== -1) {
            console.log('deleted')
            totalPlayers.splice(index2, 1);
            }

            if (roomName) {
                // Inform the other player in the room about disconnection
                socket.to(roomName).emit('playerDisconnected', roomName);
                // Remove the room
                console.log("disconnected", roomName)
                delete rooms[roomName];
            }
        });
    });
}

// Helper function to find room by socket ID
function findRoomBySocketId(socketId) {
    for (const roomName in rooms) {
        if (rooms.hasOwnProperty(roomName)) {
            const room = rooms[roomName];
            if (room.player1.id === socketId || room.player2.id === socketId) {
                return roomName;
            }
        }
    }
    return null;
  }
  
  // Helper function to check if the name is already taken
function isNameTaken(playerName) {
    for (const player of waitingPlayers) {
        if (player.playerName == playerName) {
            return true;
        }
    }
    return false;
  }
  
  function isNameTakenFromTotalPlayers(playerName) {
    for (const player of totalPlayers) {
        if (player.playerName == playerName) {
            return true;
        }
    }
    return false;
  }
  
  function isRoomTaken(playerName) {
    for (const roomName in rooms) {
      if (rooms.hasOwnProperty(roomName)) {
          const room = rooms[roomName];
          if (room.player1.name === playerName || room.player1.id === playerName) {
            return true;
          }
      }
    }
    return false;
  }

module.exports = { handleSocketEvents };
