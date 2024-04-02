const mysql = require('mysql');
const { dbConfig } = require('./config');

const pool = mysql.createPool(dbConfig);

function getConnectionFromPool() {
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

module.exports = { getConnectionFromPool, queryDatabase };
