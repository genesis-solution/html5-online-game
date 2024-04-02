const { getConnectionFromPool, queryDatabase } = require('../database');
const { secretKey } = require('../config/config');
const jwt = require('jsonwebtoken');

async function login(req, res) {
  const { username, password } = req.body;

  try {
    // Get a connection from the pool
    const connection = await getConnectionFromPool();

    // Perform database query
    const result = await queryDatabase(connection, `SELECT * FROM players WHERE username = '${username}' AND password = '${password}'`);

    // Release the connection back to the pool
    connection.release();

    if (result.length > 0) {
      // Generate and send token
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

    // Perform database query
    const result = await queryDatabase(connection, `SELECT * FROM players WHERE username = '${username}'`);

    if (result.length > 0) {
      res.status(400).send('Username already taken. Please choose another one.');
    } else {
      // Insert user into database
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
  // Logout logic, destroy session, etc.
}

async function generateJWTtoken(req, res) {
  // Generate JWT token logic
}

module.exports = { login, register, logout, generateJWTtoken };
