const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql');
const session = require('express-session');
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const jwt = require('jsonwebtoken');
const io = socketIo(server);
const bodyParser = require('body-parser');
const PORT = 9000;

const secretKey = 'html5_game_by_alex'; // Change this to your actual secret key

// Create MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'html5_game',
  connectionLimit: 10 // Adjust as needed
});

// Function to get a connection from the pool
function getConnectionFromPool(pool) {
  return new Promise((resolve, reject) => {
    pool.getConnection((error, connection) => {
      if (error) {
        reject(error);
      } else {
        resolve(connection);
      }
    });
  });
}

// Function to execute a query on the database connection
function queryDatabase(connection, sqlQuery) {
  return new Promise((resolve, reject) => {
    connection.query(sqlQuery, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

app.use(cors());
app.use(bodyParser.json());
// Session management
app.use(session({
  secret: 'testkey123',
  resave: false,
  saveUninitialized: true
}));

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  let token = req.headers['authorization'];

  if (token == null) token = req.query.authorization;
  if (token == null) return res.redirect('/');

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.redirect('/');

    if (!isNameTaken(user.username) && !isRoomTaken(user.username) && !isNameTakenFromTotalPlayers(user.username)) {
      req.user = user;
      next();
    } else {
      return res.redirect('/?authorization=' + token);
    }
    
});
  
};

// Endpoint to serve the HTML login/register page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/game', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Endpoint to serve the user's information (username) to the client
app.get('/user/info', authenticateToken, (req, res) => {
  const { username } = req.user;
  res.json({ username });
});

app.get('/currenttime', authenticateToken, (req, res) => {
  const { username } = req.user;
  res.json({ username });
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/generateJWTtoken', (req, res) => {
  const {username, password} = req.query
  const user = { username: username, password: password };
  // Generate and send token
  const token = jwt.sign(user, secretKey);

  res.json({ token })
})
// Endpoint to handle user registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get a connection from the pool
    const connection = await getConnectionFromPool(pool);

    // Perform database query
    const result = await queryDatabase(connection, 'SELECT * FROM players WHERE username = ' + username);

    // Release the connection back to the pool
    connection.release();

    if (result.length > 0) {
      res.status(400).send('Username already taken. Please choose another one.');
    } else {
      const connection1 = await getConnectionFromPool(pool);

      // Perform database query
      const result1 = await queryDatabase(connection1, 'INSERT INTO players (username, password) VALUES (' + username + ', ' + password + ')');
  
      // Release the connection back to the pool
      connection1.release();

      res.redirect('/login.html');
    }
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).send('Internal server error');
  }
});

// Endpoint to handle user login
app.post('/login', (req, res) => {
  const { token } = req.body;

  jwt.verify(token, secretKey, (err, user) => {
      if (err) return res.status(401).json({ error: 'Invalid credentials' });

      if (!isNameTaken(user.username) && !isRoomTaken(user.username) && !isNameTakenFromTotalPlayers(user.username)) {
        return res.status(200).json({ error: 'Success' });
      }
      else {
        return res.status(401).json({ error: 'Already joined with same account' });
      }
  });

  
});

app.post('/logout', authenticateToken, (req, res) => {
  // Destroy the user's session to log them out
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Internal server error');
    }
    // Redirect to the login page after successful logout
    res.sendStatus(200);
  });
});

app.post('/result', authenticateToken, async (req, res) => {
  // Destroy the user's session to log them out
  var { score, user, opponentScore, oppenent, room } = req.body;

  console.log(req.body)

  try {

    if (room == '') {
      room = 'Computer'
  
      const connection = await getConnectionFromPool(pool);

      // Perform database query
      const result = await queryDatabase(connection, `INSERT INTO player_results (score, user, opponentScore, oppenent, room) VALUES (${score}, '${user}', ${opponentScore}, '${oppenent}', '${room}')`);

      // Release the connection back to the pool
      connection.release();
    } else {
      const connection = await getConnectionFromPool(pool);

      // Perform database query
      const result = await queryDatabase(connection, `SELECT * FROM player_results WHERE (user = '${user}' OR oppenent = '${user}')  AND room = '${room}'`);

      // Release the connection back to the pool
      connection.release();

      if (result.length == 0) {
        const connection1 = await getConnectionFromPool(pool);

        // Perform database query
        const result1 = await queryDatabase(connection1, `INSERT INTO player_results (score, user, opponentScore, oppenent, room) VALUES (${score}, '${user}', ${opponentScore}, '${oppenent}', '${room}')`);

        // Release the connection back to the pool
        connection1.release();
      }
    }
    res.json({success: true})
  } catch (error) {
    console.error('Error:', error.message);
    
    res.json({success: false})
  }
});

let totalPlayers = [];
let waitingPlayers = []; // Store players waiting to be matched
let rooms = {}; // Store game rooms

// Game logic (replace this with your actual game logic)
io.on('connection', (socket) => {

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

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
