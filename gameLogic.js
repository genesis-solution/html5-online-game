const request = require('request');
const xml2js = require('xml2js');
const { server_url } = require('./config/config');

// for invited members
let groupPlayers = [];

let waitingPlayers = []; // Store players waiting to be matched
let rooms = {}; // Store game rooms

function handleSocketEvents(io) {

    io.on('connection', (socket) => {

        // Handle joinGame event
        socket.on('joinGame', (player) => {
            if (player.player.entityId != '' && !isNameTaken(player.player.entityId) && !isRoomTaken(player.player.entityId)) {
                console.log('New client connected');
                // If the name is not taken, proceed
                socket.playerName = player.playerName; // Store the player's name in the socket object
                socket.TokenId = player.player.TokenId;
                socket.gameID = 1;
                socket.Status = player.player.Status;
                socket.betUsd = player.player.betUsd;
                socket.CountryName = player.player.CountryName;
                socket.entityId = player.player.entityId;
                socket.isBot = player.isBot; // 0 or 1

                waitingPlayers.push(socket); // Add the player to the waiting list

                // Try to match players when there are at least two waiting
                if (waitingPlayers.length >= 2) {
                    const player1 = waitingPlayers.shift();
                    const player2 = waitingPlayers.shift();

                    const date = new Date();
                    const roomName = `Room-${date.getTime()}`;
                    console.log("created room", roomName)

                    let obj_player1 = { id: player1.id, name: player1.playerName, username: player1.playerName, playerName: player1.playerName, CountryName: player1.CountryName, entityId: player1.entityId, TokenId: player1.TokenId, gameID: player1.gameID, Status: player1.Status, betUsd: player1.betUsd, CountryName: player1.CountryName, isBot: player1.isBot };
                    let obj_player2 = { id: player2.id, name: player2.playerName, username: player2.playerName, playerName: player2.playerName, CountryName: player2.CountryName, entityId: player2.entityId, TokenId: player2.TokenId, gameID: player2.gameID, Status: player2.Status, betUsd: player2.betUsd, CountryName: player2.CountryName, isBot: player2.isBot };

                    try {
                        const url = server_url;
                        const func_name = "Entity_Entry_Update";
                    
                        var soapOptions = {
                          uri: url,
                          headers: {
                              'Content-Type': 'text/xml; charset=utf-8',
                              'Connection': 'keep-alive'
                          },
                          method: 'POST',
                          body: `
                            <env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:enc="http://www.w3.org/2003/05/soap-encoding" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns2="urn:CommonWSTypes">
                            <env:Body>
                            <ns1:Entity_Entry_Update env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
                            <TokenIds enc:itemType="xsd:string" enc:arraySize="2" xsi:type="ns2:ArrayOfString">
                            <item xsi:type="xsd:string">`+obj_player1.TokenId+`</item>
                            <item xsi:type="xsd:string">`+obj_player2.TokenId+`</item>
                            </TokenIds>
                            <gameID xsi:type="xsd:int">`+obj_player1.gameID+`</gameID>
                            <games_entryID xsi:type="xsd:int">0</games_entryID>
                            <NamesArray xsi:nil="true" xsi:type="ns2:ArrayOfString"/>
                            <ValuesArray xsi:nil="true" xsi:type="ns2:ArrayOfString"/></ns1:Entity_Entry_Update>
                            </env:Body>
                            </env:Envelope>
                              `
                        };
                    
                        
                        request(soapOptions, function(_err, _resp) {
                          if (_err == null) {
                            if (_resp.statusCode == 200)
                            {
                              xml2js.parseString(_resp.body, async (err, result) => {
                                if (err) {
                                    console.error('Error parsing XML response:', err);
                                    res.status(401).json({ error: 'Invalid credentials' });
                                } else {
                                  if (result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'] != undefined && result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'].length > 0)
                                  {
                                    const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
                                    var returnValue = JSON.parse(resultValue)

                                    console.log(returnValue)
                    
                                    if (returnValue.ResultCode == 0 && returnValue.ResultMessage == 'OK') {
                                        obj_player1['games_entryID'] = returnValue.games_entryID;
                                        obj_player2['games_entryID'] = returnValue.games_entryID;
                                        obj_player1['prizeUSD'] = returnValue.prizeUSD
                                        obj_player2['prizeUSD'] = returnValue.prizeUSD

                                        rooms[roomName] = {
                                            player1: obj_player1,
                                            player2: obj_player2
                                        };
                    
                                        player1.join(roomName);
                                        player2.join(roomName);
                    
                                        // Inform clients they joined the room
                                        player1.emit('joinedRoom', roomName);
                                        player2.emit('joinedRoom', roomName);


                                        io.to(roomName).emit('startGamebySocket', [obj_player1, obj_player2]);
                                    }
                                    else {
                                      
                                    }
                                  }
                                  else {
                                    
                                  }
                                }
                              });
                            }
                          } else {
                            console.log(_err)
                          }
                        });
                    } catch (error) {
                    console.error('start game:', error.message);
                    }
                }
            } else {
                // Inform client that the name is already taken
                socket.emit('nameTaken');
            }
        });

        // Group Game
        socket.on('groupGame', (player) => {
            if (player.player.entityId != '' && !isRoomTaken(player.player.entityId)) {
                console.log('Group connected ' + player.eIDGroup);

                // Getting individual entities from eIDGroup
                let groupEntities = player.eIDGroup.split(/,|%2C/i);
                groupEntities.sort();
                let groupName = groupEntities.join("-");

                // If the name is not taken, proceed
                socket.playerName = player.playerName; // Store the player's name in the socket object
                socket.TokenId = player.player.TokenId;
                socket.gameID = 1;
                socket.Status = player.player.Status;
                socket.betUsd = player.player.betUsd;
                socket.CountryName = player.player.CountryName;
                socket.entityId = player.player.entityId;
                socket.isBot = player.isBot; // 0 or 1
                socket.eIDGroup = groupName

                // Check if this group member is valid
                if (!isNameTakenFromGroupPlayers(player.player.entityId, groupName) && groupEntities.includes(String(player.player.entityId)))
                {
                    groupPlayers.push(socket); // Add the player to the waiting list
                }

                var groupMembers = getPlayersByGroup(groupName);
                // Try to match players when there are at least two waiting
                if (groupMembers.length >= 2 && groupEntities.includes(String(player.player.entityId))) {

                    const player1 = groupMembers[0];
                    const player2 = groupMembers[1];

                    const date = new Date();
                    const roomName = `Room-${date.getTime()}`;
                    console.log("created room for group ", roomName)

                    let obj_player1 = { id: player1.id, name: player1.playerName, username: player1.playerName, playerName: player1.playerName, CountryName: player1.CountryName, entityId: player1.entityId, TokenId: player1.TokenId, gameID: player1.gameID, Status: player1.Status, betUsd: player1.betUsd, CountryName: player1.CountryName, isBot: player1.isBot, eIDGroup: player1.eIDGroup };
                    let obj_player2 = { id: player2.id, name: player2.playerName, username: player2.playerName, playerName: player2.playerName, CountryName: player2.CountryName, entityId: player2.entityId, TokenId: player2.TokenId, gameID: player2.gameID, Status: player2.Status, betUsd: player2.betUsd, CountryName: player2.CountryName, isBot: player2.isBot, eIDGroup: player2.eIDGroup };

                    try {
                        const url = server_url;
                        const func_name = "Entity_Entry_Update";
                    
                        var soapOptions = {
                          uri: url,
                          headers: {
                              'Content-Type': 'text/xml; charset=utf-8',
                              'Connection': 'keep-alive'
                          },
                          method: 'POST',
                          body: `
                            <env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:enc="http://www.w3.org/2003/05/soap-encoding" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns2="urn:CommonWSTypes">
                            <env:Body>
                            <ns1:Entity_Entry_Update env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
                            <TokenIds enc:itemType="xsd:string" enc:arraySize="2" xsi:type="ns2:ArrayOfString">
                            <item xsi:type="xsd:string">`+obj_player1.TokenId+`</item>
                            <item xsi:type="xsd:string">`+obj_player2.TokenId+`</item>
                            </TokenIds>
                            <gameID xsi:type="xsd:int">`+obj_player1.gameID+`</gameID>
                            <games_entryID xsi:type="xsd:int">0</games_entryID>
                            <NamesArray xsi:nil="true" xsi:type="ns2:ArrayOfString"/>
                            <ValuesArray xsi:nil="true" xsi:type="ns2:ArrayOfString"/></ns1:Entity_Entry_Update>
                            </env:Body>
                            </env:Envelope>
                              `
                        };

                        request(soapOptions, function(_err, _resp) {
                          if (_err == null) {
                            if (_resp.statusCode == 200)
                            {
                              xml2js.parseString(_resp.body, async (err, result) => {
                                if (err) {
                                    console.error('Error parsing XML response:', err);
                                    res.status(401).json({ error: 'Invalid credentials' });
                                } else {
                                  if (result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'] != undefined && result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'].length > 0)
                                  {
                                    const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
                                    var returnValue = JSON.parse(resultValue)
                    
                                    if (returnValue.ResultCode == 0 && returnValue.ResultMessage == 'OK') {
                                        obj_player1['games_entryID'] = returnValue.games_entryID;
                                        obj_player2['games_entryID'] = returnValue.games_entryID;
                                        obj_player1['prizeUSD'] = returnValue.prizeUSD
                                        obj_player2['prizeUSD'] = returnValue.prizeUSD

                                        rooms[roomName] = {
                                            player1: obj_player1,
                                            player2: obj_player2
                                        };
                    
                                        player1.join(roomName);
                                        player2.join(roomName);
                    
                                        // Inform clients they joined the room
                                        player1.emit('joinedRoom', roomName);
                                        player2.emit('joinedRoom', roomName);

                                        // delete the members from groupPlayers
                                        for (let index_member = 0; index_member < 2; index_member++) {
                                            let _index = groupPlayers.findIndex(obj => obj.eIDGroup === obj_player1.eIDGroup);
                                            if (_index !== -1) {
                                                groupPlayers.splice(_index, 1);
                                            }
                                        }
                                        
                                        io.to(roomName).emit('startGamebySocket', [obj_player1, obj_player2]);
                                    }
                                    else {
                                      
                                    }
                                  }
                                  else {
                                    
                                  }
                                }
                              });
                            }
                          } else {
                            console.log(_err)
                          }
                        });

                    } catch (error) {
                        console.error('start game:', error.message);
                    }
                }
                else {
                    if (groupEntities.includes(String(player.player.entityId))) {

                        let opponentEntities = groupEntities.filter(item => item !== String(player.player.entityId));
                        if (opponentEntities.length > 0) {
                            // Getting the name of opponent name
                            let opponentMember = {
                                entityId: opponentEntities[0],
                                name: opponentEntities[0] + ' user'
                            }
                            socket.emit('waitingGroupMember', [opponentMember]);
                        }
                    }
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

        // Handle player moves
        socket.on('sendEmoji', (emojiName) => {
            const roomName1 = findRoomBySocketId(socket.id);
            if (roomName1) {
                for (const roomName in rooms) {
                    if (rooms.hasOwnProperty(roomName)) {
                        const room = rooms[roomName];
                        if (room.player1.id === socket.id || room.player2.id === socket.id) {
                            io.to(room.player1.id).emit('sendEmoji', emojiName);
                            io.to(room.player2.id).emit('sendEmoji', emojiName);
                        }
                    }
                }
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
            // const roomName = findRoomBySocketId(socket.id);
            // const index = waitingPlayers.indexOf(socket);
            // if (index !== -1) {
            //     waitingPlayers.splice(index, 1);
            // }

            // if (roomName) {
            //     // Inform the other player in the room about disconnection
            //     socket.to(roomName).emit('playerDisconnected', roomName);
            //     // Remove the room
            //     console.log("disconnected", roomName)
            //     delete rooms[roomName];
            // }
        });

        socket.on('disconnect', () => {
            const roomName1 = findRoomBySocketId(socket.id);

            const index = waitingPlayers.findIndex(obj => obj.id == socket.id);
            if (index !== -1) {
                waitingPlayers.splice(index, 1);
            }

            const index3 = waitingPlayers.findIndex(obj => obj.id == socket.id);
            if (index3 !== -1) {
                waitingPlayers.splice(index3, 1);
            }

            const _index = groupPlayers.findIndex(obj => obj.id == socket.id);
            if (_index !== -1) {
                groupPlayers.splice(_index, 1);
            }

            const _index3 = groupPlayers.findIndex(obj => obj.id == socket.id);
            if (_index3 !== -1) {
                groupPlayers.splice(_index3, 1);
            }
            
            console.log("roomName", roomName1)

            if (roomName1) {
                for (const roomName in rooms) {
                    if (rooms.hasOwnProperty(roomName)) {
                        const room = rooms[roomName];
                        let winnerID = ''
                        
                        if (room.player1.isBot == 1) {
                            winnerID = room.player1.entityId;
                            Player= room.player1;
                        } else if (room.player2.isBot == 1) {
                            winnerID = room.player2.entityId;
                            Player= room.player2;
                        }
                        console.log("bot winner", winnerID)
                        if (winnerID != '') {
                            try {
                                const url = server_url;
                                const func_name = "Entity_Entry_Update";
                            
                                var soapOptions = {
                                  uri: url,
                                  headers: {
                                      'Content-Type': 'text/xml; charset=utf-8',
                                      'Connection': 'keep-alive'
                                  },
                                  method: 'POST',
                                  body: `
                                      <env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:enc="http://www.w3.org/2003/05/soap-encoding" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns2="urn:CommonWSTypes">
                                      <env:Body>
                                      <ns1:`+func_name+` env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
                                      <TokenIds enc:itemType="xsd:string" enc:arraySize="2" xsi:type="ns2:ArrayOfString">
                                      <item xsi:type="xsd:string">`+room.player1.TokenId+`</item>
                                      <item xsi:type="xsd:string">`+room.player2.TokenId+`</item>
                                      </TokenIds>
                                      <gameID xsi:type="xsd:int">1</gameID>
                                      <games_entryID xsi:type="xsd:int">`+room.player1.games_entryID+`</games_entryID>
                                      <NamesArray enc:itemType="xsd:string" enc:arraySize="1" xsi:type="ns2:ArrayOfString">
                                      <item xsi:type="xsd:string">won_EntityId</item>
                                      </NamesArray>
                                      <ValuesArray enc:itemType="xsd:string" enc:arraySize="1" xsi:type="ns2:ArrayOfString">
                                      <item xsi:type="xsd:string">`+winnerID+`</item>
                                      </ValuesArray>
                                      </ns1:Entity_Entry_Update>
                                      </env:Body>
                                      </env:Envelope>
                                      `
                                };
                                
                                request(soapOptions, function(_err, _resp) {
                                  if (_err == null) {
                                    if (_resp.statusCode == 200)
                                    {
                                        console.log("bot win")
                                    }
                                    else {
                                        console.log(_resp)
                                    }
                                  } else {
                                    console.log(_err)
                                  }
                                });
                              } catch (error) {
                                console.error('Error:', error.message);
                              }
                        }
                    }
                }

                // Inform the other player in the room about disconnection
                socket.to(roomName1).emit('playerDisconnected', roomName1);
                // Remove the room
                console.log("disconnected", roomName1)
                delete rooms[roomName1];
            }
        });

        socket.on('disconnect_game', () => {
            const roomName1 = findRoomBySocketId(socket.id);

            const index = waitingPlayers.findIndex(obj => obj.id == socket.id);
            if (index !== -1) {
                waitingPlayers.splice(index, 1);
            }

            const index3 = waitingPlayers.findIndex(obj => obj.id == socket.id);
            if (index3 !== -1) {
                waitingPlayers.splice(index3, 1);
            }

            const _index = groupPlayers.findIndex(obj => obj.id == socket.id);
            if (_index !== -1) {
                groupPlayers.splice(_index, 1);
            }

            const _index3 = groupPlayers.findIndex(obj => obj.id == socket.id);
            if (_index3 !== -1) {
                groupPlayers.splice(_index3, 1);
            }

            console.log("roomName", roomName1)

            if (roomName1) {
                // Inform the other player in the room about disconnection
                socket.to(roomName1).emit('playerDisconnected', roomName1);
                // Remove the room
                console.log("disconnected", roomName1)
                delete rooms[roomName1];
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
function isNameTaken(playerName) { // player.player.entityId
    for (const player of waitingPlayers) {
        if (player.entityId == playerName) {
            return true;
        }
    }
    return false;
}
  
function getPlayersByGroup(eIDGroup) {
    let players = [];
    for (const player of groupPlayers) {
        if (player.eIDGroup == eIDGroup) {
            players.push(player);
        }
    }
    return players;
}

function isNameTakenFromGroupPlayers(playerName, eIDGroup) {
    for (const player of groupPlayers) {
        if (player.entityId == playerName && player.eIDGroup == eIDGroup) {
            return true;
        }
    }
    return false;
}
  
function isRoomTaken(playerName) {
    for (const roomName in rooms) {
      if (rooms.hasOwnProperty(roomName)) {
          const room = rooms[roomName];
          if (room.player1.entityId === playerName || room.player2.entityId === playerName) {
            return true;
          }
      }
    }
    return false;
}
  

module.exports = { handleSocketEvents };
