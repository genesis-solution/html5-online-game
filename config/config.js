require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const serverPort = process.env.SERVER_PORT || 9000;
const secretKey = process.env.SECRET_KEY || 'html5_game_by_alex';
const server_url = process.env.SERVER_URL || 'http://isapi.mekashron.com/SmartWinners/player1.dll/soap/IPlayer1';

module.exports = { dbConfig, serverPort, secretKey, server_url };
