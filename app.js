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
// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'html5_game',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

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

      req.user = user;
      next();
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

app.get('/game.html', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Endpoint to serve the user's information (username) to the client
app.get('/user/info', authenticateToken, (req, res) => {
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
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Check if the username is already taken
  db.query('SELECT * FROM players WHERE username = ?', [username], (err, results) => {
    if (err) {
      console.error('Error checking username:', err);
      return res.status(500).send('Internal server error');
    }

    if (results.length > 0) {
      return res.status(400).send('Username already taken. Please choose another one.');
    }

    // Insert the new user into the database
    db.query('INSERT INTO players (username, password) VALUES (?, ?)', [username, password], (err) => {
      if (err) {
        console.error('Error registering user:', err);
        return res.status(500).send('Internal server error');
      }

      res.redirect('/login.html');
    });
  });
});

// Endpoint to handle user login
app.post('/login', (req, res) => {
  const { token } = req.body;

  jwt.verify(token, secretKey, (err, user) => {
      if (err) return res.status(401).json({ error: 'Invalid credentials' });

      // Check if the username and password match a registered user
      db.query('SELECT * FROM players WHERE username = ? AND password = ?', [user.username, user.password], (err, results) => {
        if (err) {
          console.error('Error checking login credentials:', err);
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (results.length === 0) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        return res.status(200).json({ error: 'Success' });
      });
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

app.post('/result', authenticateToken, (req, res) => {
  // Destroy the user's session to log them out
  var { score, user, opponentScore, oppenent, room } = req.body;

  console.log(req.body)
  if (room == '') {
    room = 'Computer'

    db.query(
      'INSERT INTO player_results (score, user, opponentScore, oppenent, room) VALUES (?, ?, ?, ?, ?)',
      [score, user, opponentScore, oppenent, room],
      (err) => {
        if (err) {
          console.error('Error saving game result to database:', err);
        }

      }
    );
  } else {
    db.query('SELECT * FROM player_results WHERE (user = ? OR oppenent = ?)  AND room = ?', [user, user, room], (err, results) => {
      if (err) {
        console.error('Error checking login credentials:', err);
      }
  
      if (results.length === 0) {
        db.query(
          'INSERT INTO player_results (score, user, opponentScore, oppenent, room) VALUES (?, ?, ?, ?, ?)',
          [score, user, opponentScore, oppenent, room],
          (err) => {
            if (err) {
              console.error('Error saving game result to database:', err);
            }
            
          }
        );
      }
    });
  }
  res.json({success: true})
});


let waitingPlayers = []; // Store players waiting to be matched
let rooms = {}; // Store game rooms

// Game logic (replace this with your actual game logic)
io.on('connection', (socket) => {

   // Handle joinGame event
   socket.on('joinGame', (playerName) => {
    if (!isNameTaken(playerName)) {
        // If the name is not taken, proceed
        socket.playerName = playerName; // Store the player's name in the socket object
        waitingPlayers.push(socket); // Add the player to the waiting list

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

  socket.on('disconnect', () => {
    const roomName = findRoomBySocketId(socket.id);
    if (roomName) {
        const index = waitingPlayers.indexOf(socket);
        if (index !== -1) {
            waitingPlayers.splice(index, 1);
        }
        // Inform the other player in the room about disconnection
        socket.to(roomName).emit('playerDisconnected', roomName);
        // Remove the room
        console.log("disconnected", roomName)
        delete rooms[roomName];
    } else {
        // Remove player from waiting list if disconnected before match
        const index = waitingPlayers.indexOf(socket);
        if (index !== -1) {
            waitingPlayers.splice(index, 1);
        }
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

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
