const { getConnectionFromPool, queryDatabase } = require('../config/database');
const { secretKey } = require('../config/config');
const jwt = require('jsonwebtoken');

async function login(req, res) {
  const { username, password } = req.body;

  try {
    // Get a connection from the pool
    const connection = await getConnectionFromPool();

    // Perform database query to check if the user exists
    const result = await queryDatabase(connection, `SELECT * FROM players WHERE username = '${username}' AND password = '${password}'`);

    // Release the connection back to the pool
    connection.release();

    // If user exists and password matches, generate and send token
    if (result.length > 0) {
      const token = jwt.sign({ username }, secretKey);
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).send('Internal server error');
  }
}

async function register(req, res) {
  const { username, password } = req.body;

  try {
    // Get a connection from the pool
    const connection = await getConnectionFromPool();

    // Check if the username already exists in the database
    const existingUser = await queryDatabase(connection, `SELECT * FROM players WHERE username = '${username}'`);

    // If username already exists, return error
    if (existingUser.length > 0) {
      res.status(400).send('Username already taken. Please choose another one.');
    } else {
      // Insert the new user into the database
      await queryDatabase(connection, `INSERT INTO players (username, password) VALUES ('${username}', '${password}')`);
      res.status(201).send('User registered successfully.');
    }

    // Release the connection back to the pool
    connection.release();
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).send('Internal server error');
  }
}

async function logout(req, res) {
  // Implement logout logic here, such as destroying session, clearing tokens, etc.
}

async function generateJWTtoken(req, res) {
  // Implement logic to generate JWT token based on user credentials
  const {username, password} = req.query
  const user = { username: username, password: password };
  // Generate and send token
  const token = jwt.sign(user, secretKey);

  res.json({ token })
}

async function result(req, res) {
    var { score, user, opponentScore, oppenent, room } = req.body;

    console.log(req.body)

    try {
        if (room == '') {
            room = 'Computer'
        
            const connection = await getConnectionFromPool();

            // Perform database query
            const result = await queryDatabase(connection, `INSERT INTO player_results (score, user, opponentScore, oppenent, room) VALUES (${score}, '${user}', ${opponentScore}, '${oppenent}', '${room}')`);

            // Release the connection back to the pool
            connection.release();
        } else {
            const connection = await getConnectionFromPool();

            // Perform database query
            const result = await queryDatabase(connection, `SELECT * FROM player_results WHERE (user = '${user}' OR oppenent = '${user}')  AND room = '${room}'`);

            // Release the connection back to the pool
            connection.release();

            if (result.length == 0) {
                const connection1 = await getConnectionFromPool();

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
  }

  function getUserInfo(req, res) {
    const { username } = req.user;
    res.json({ username });
  }
  
  function getCurrentTime(req, res) {
    const currentTime = new Date().toLocaleTimeString();
    res.json({ currentTime });
  }
  
  module.exports = { login, register, logout, generateJWTtoken, result, getUserInfo, getCurrentTime };
