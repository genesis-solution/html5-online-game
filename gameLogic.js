const request = require('request');
const xml2js = require('xml2js');

let totalPlayers = [];
let waitingPlayers = []; // Store players waiting to be matched
let rooms = {}; // Store game rooms

function handleSocketEvents(io) {

    io.on('connection', (socket) => {
        console.log('New client connected');

        // Handle joinGame event
        socket.on('joinGame', (player) => {
            if (!isNameTaken(player.playerName) && !isRoomTaken(player.playerName) && !isNameTakenFromTotalPlayers(player.playerName)) {
                // If the name is not taken, proceed
                socket.playerName = player.playerName; // Store the player's name in the socket object
                socket.TokenId = player.player.TokenId;
                socket.gameID = player.player.gameID;
                socket.Status = player.player.Status;
                socket.betUsd = player.player.betUsd;
                socket.CountryName = player.player.CountryName;
                socket.entityId = player.player.entityId;

                waitingPlayers.push(socket); // Add the player to the waiting list
                totalPlayers.push(socket);

                // Try to match players when there are at least two waiting
                if (waitingPlayers.length >= 2) {
                    const player1 = waitingPlayers.shift();
                    const player2 = waitingPlayers.shift();

                    const date = new Date();
                    const roomName = `Room-${date.getTime()}`;
                    console.log("created room", roomName)

                    const obj_player1 = { id: player1.id, name: player1.playerName, username: player1.playerName, playerName: player1.playerName, CountryName: player1.CountryName, entityId: player1.entityId, TokenId: player1.TokenId, gameID: player1.gameID, Status: player1.Status, betUsd: player1.betUsd, CountryName: player1.CountryName };
                    const obj_player2 = { id: player2.id, name: player2.playerName, username: player2.playerName, playerName: player2.playerName, CountryName: player2.CountryName, entityId: player2.entityId, TokenId: player2.TokenId, gameID: player2.gameID, Status: player2.Status, betUsd: player2.betUsd, CountryName: player2.CountryName };

                    rooms[roomName] = {
                        player1: obj_player1,
                        player2: obj_player2
                    };

                    player1.join(roomName);
                    player2.join(roomName);

                    // Inform clients they joined the room
                    player1.emit('joinedRoom', roomName);
                    player2.emit('joinedRoom', roomName);

                    // Inform clients the game started
                    io.to(roomName).emit('startGamebySocket', [obj_player1, obj_player2]);
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
