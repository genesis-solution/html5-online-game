const { getConnectionFromPool, queryDatabase } = require('../config/database');
const { secretKey } = require('../config/config');
const jwt = require('jsonwebtoken');
const request = require('request');
const xml2js = require('xml2js');

async function login(req, res) {
  const { t, gameID } = req.body;

  try {
    const url = 'http://isapi.mekashron.com/SmartWinners/player1.dll/soap/IPlayer1';
    const func_name = "Entity_Get";

    var soapOptions = {
      uri: url,
      headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Connection': 'keep-alive'
      },
      method: 'POST',
      body: `<?xml version="1.0" encoding="UTF-8"?>
          <env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns2="urn:CommonWSTypes" xmlns:enc="http://www.w3.org/2003/05/soap-encoding">
          <env:Body>
          <ns1:`+func_name+` env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
          <tokenID xsi:type="xsd:string">`+t+`</tokenID>
          <gameID xsi:type="xsd:int">`+gameID+`</gameID>
          <Fields xsi:nil="true" xsi:type="ns2:ArrayOfString"/>
          </ns1:`+func_name+`></env:Body>
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
              const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
              var userInfo = JSON.parse(resultValue)

              if (userInfo.ResultCode == undefined && userInfo.ResultMessage == undefined) {
                req.user = {
                  username: userInfo.Name,
                  betUsd: userInfo.betUsd,
                  Status: userInfo.Status,
                  CountryName: 'Israel',
                  TokenId: '',
                  entityId: ''
                }
                res.json({token: t})
              }
              else {
                res.status(401).json({ error: userInfo.ResultMessage });
              }
            }
          });
        }
        else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      } else {
        console.log(_err)
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(401).json({ error: 'Invalid credentials' });
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
    res.json(req.user);
  }

  function getBotInfo(req, res) {
    const { gameID, t } = req.query;

    try {
      const url = 'http://isapi.mekashron.com/SmartWinners/player1.dll/soap/IPlayer1';
      const func_name = "Bot_Get";
  
      var soapOptions = {
        uri: url,
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Connection': 'keep-alive'
        },
        method: 'POST',
        body: `<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:enc="http://www.w3.org/2003/05/soap-encoding">
        <env:Body>
        <ns1:`+func_name+` env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
        <GameId xsi:type="xsd:int">`+gameID+`</GameId>
        <betUSD xsi:type="xsd:double">0</betUSD>
        </ns1:`+func_name+`>
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

                const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
                var userInfo = JSON.parse(resultValue)
  
                if (userInfo.ResultCode == undefined && userInfo.ResultMessage == undefined) {
                  console.log(userInfo)
                  res.json({
                    username: userInfo.Name,
                    CountryName: userInfo.CountryName,
                    TokenId: userInfo.TokenId,
                    entityId: userInfo.entityId,
                    betUsd: 0,
                    Status: 0
                  })
                }
                else {
                  res.status(401).json({ error: userInfo.ResultMessage });
                }
              }
            });
          }
          else {
            res.status(401).json({ error: 'Invalid credentials' });
          }
        } else {
          console.log(_err)
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });
    } catch (error) {
      console.error('Error:', error.message);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  }
  
  function getCurrentTime(req, res) {
    const currentTime = new Date().toLocaleTimeString();
    res.json({ currentTime });
  }
  
  module.exports = { login, register, logout, generateJWTtoken, result, getUserInfo, getBotInfo, getCurrentTime };
