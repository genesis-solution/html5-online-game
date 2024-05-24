const { getConnectionFromPool, queryDatabase } = require('../config/database');
const { secretKey, server_url } = require('../config/config');
const jwt = require('jsonwebtoken');
const request = require('request');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

async function login(req, res) {
  const { t } = req.body;

  var gameID = 1;
  try {
    const url = server_url;
    const func_name = "Entity_Get";

    var soapOptions = {
      uri: url,
      headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Connection': 'keep-alive'
      },
      method: 'POST',
      body: `
          <env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:enc="http://www.w3.org/2003/05/soap-encoding" xmlns:ns2="urn:CommonWSTypes">
          <env:Body>
          <ns1:`+func_name+` env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
          <tokenID xsi:type="xsd:string">`+t+`</tokenID>
          <gameID xsi:type="xsd:int">`+gameID+`</gameID>
          <Fields enc:itemType="xsd:string" enc:arraySize="3" xsi:type="ns2:ArrayOfString">
          <item xsi:type="xsd:string">e.EntityId</item>
          <item xsi:type="xsd:string">c.countryname</item>
          </Fields>
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
              if (result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'] != undefined && result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'].length > 0)
              {
                const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
                var userInfo = JSON.parse(resultValue)

                if (userInfo.ResultCode == undefined && userInfo.ResultMessage == undefined) {
                  req.user = {
                    username: userInfo.Name,
                    betUsd: userInfo.betUsd,
                    Status: userInfo.Status,
                    CountryName: userInfo.countryname,
                    TokenId: t,
                    gameID: gameID,
                    entityId: userInfo.EntityId
                  }
                  res.json({token: t})
                }
                else {
                  res.status(401).json({ error: userInfo.ResultMessage });
                }
              }
              else {
                res.status(401).json({ error: "Already joined" });
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

    var { score, user, opponentScore, oppenent, room, winner } = req.body;

    console.log("result", req.body)

    var gameID = 1;

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
            <item xsi:type="xsd:string">`+user.TokenId+`</item>
            <item xsi:type="xsd:string">`+oppenent.TokenId+`</item>
            </TokenIds>
            <gameID xsi:type="xsd:int">`+gameID+`</gameID>
            <games_entryID xsi:type="xsd:int">`+oppenent.games_entryID+`</games_entryID>
            <NamesArray enc:itemType="xsd:string" enc:arraySize="1" xsi:type="ns2:ArrayOfString">
            <item xsi:type="xsd:string">won_EntityId</item>
            </NamesArray>
            <ValuesArray enc:itemType="xsd:string" enc:arraySize="1" xsi:type="ns2:ArrayOfString">
            <item xsi:type="xsd:string">`+winner+`</item>
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
            xml2js.parseString(_resp.body, async (err, result) => {
              if (err) {
                  console.error('Error parsing XML response:', err);
                  res.status(401).json({ error: 'Invalid credentials' });
              } else {
                console.log("result response", result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'])
                if (result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'] != undefined && result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'].length > 0)
                {
                  const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];

                  try {
                    var returnValue = JSON.parse(resultValue)
  
                    if (returnValue.ResultCode == 0 && returnValue.ResultMessage == 'OK') {
                      res.json({success: true, PriseUsd: returnValue.prizeUSD})
                    }
                    else {
                      res.status(401).json({ error: returnValue.ResultMessage });
                    }
                  } catch (error_) {
                    res.status(401).json({ error: error_ });
                  }
                }
                else {
                  
                  res.status(401).json({ error: "Already joined" });
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
      res.json({success: false})
    }
  }

function getUserInfo(req, res) {
  res.json(req.user);
}

function getBotInfo(req, res) {
  const { t, betUsd } = req.query;
  var gameID = 1;

  try {
    const url = server_url;
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
      <betUSD xsi:type="xsd:double">`+betUsd+`</betUSD>
      <count xsi:type="xsd:int">`+1+`</count>
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

              if (result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'] != undefined && result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'].length > 0)
              {
                const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
                var userInfo = JSON.parse(resultValue)

                if (userInfo != null && userInfo.length > 0) {
                  res.json({
                    username: userInfo[0].Name,
                    CountryName: userInfo[0].CountryName,
                    TokenId: userInfo[0].TokenId,
                    entityId: userInfo[0].entityId,
                    betUsd: betUsd,
                    Status: 0
                  })
                }
                else {
                  console.log(userInfo.ResultMessage)
                  const errorMessage = 'https://www.player1.win/games/1/connect-four?e=' + 'No players available'; // userInfo.ResultMessage;
                  const errorHtml = fs.readFileSync(path.join(__dirname, '../public', 'error.html'), 'utf8');
                  const htmlWithErrorMessage = errorHtml.replace('{{ errorMessage }}', errorMessage);
                  return res.status(400).send(htmlWithErrorMessage);
                }
              } else {
                  console.log(userInfo.ResultMessage)
                  const errorMessage = 'https://www.player1.win/games/1/connect-four?e=' + 'No players available'; // userInfo.ResultMessage;
                  const errorHtml = fs.readFileSync(path.join(__dirname, '../public', 'error.html'), 'utf8');
                  const htmlWithErrorMessage = errorHtml.replace('{{ errorMessage }}', errorMessage);
                  return res.status(400).send(htmlWithErrorMessage);
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

function setLog(req, res) {
  const { status2, status3, isDraw } = req.query;

  try {
    const url = server_url;
    const func_name = "Entity_Entry_Log";
    let game_result = 2;

    if (isDraw == 1) game_result = 4;

    var soapOptions = {
      uri: url,
      headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Connection': 'keep-alive'
      },
      method: 'POST',
      body: `
        <env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:enc="http://www.w3.org/2003/05/soap-encoding">
        <env:Body>
        <ns1:`+func_name+` env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
        <tokenID xsi:type="xsd:string">`+status2+`</tokenID>
        <status xsi:type="xsd:int">`+ game_result +`</status>
        </ns1:Entity_Entry_Log>
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
                res.json({ error: 'Invalid credentials' });
            } else {

              const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
              var userInfo = JSON.parse(resultValue)

              if (userInfo.ResultCode == 0 && userInfo.ResultMessage == 'OK') {
                
                var soapOptions3 = {
                  uri: url,
                  headers: {
                      'Content-Type': 'text/xml; charset=utf-8',
                      'Connection': 'keep-alive'
                  },
                  method: 'POST',
                  body: `
                    <env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:enc="http://www.w3.org/2003/05/soap-encoding">
                    <env:Body>
                    <ns1:`+func_name+` env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
                    <tokenID xsi:type="xsd:string">`+status3+`</tokenID>
                    <status xsi:type="xsd:int">3</status>
                    </ns1:Entity_Entry_Log>
                    </env:Body>
                    </env:Envelope>
                      `
                };
                
                request(soapOptions3, function(_err3, _resp3) {
                  if (_err3 == null) {
                    if (_resp3.statusCode == 200)
                    {
                      xml2js.parseString(_resp3.body, async (err, result) => {
                        if (err) {
                            console.error('Error parsing XML response:', err);
                            res.json({ error: 'Invalid credentials' });
                        } else {
            
                          const resultValue3 = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
                          var userInfo = JSON.parse(resultValue3)
            
                          if (userInfo.ResultCode == 0 && userInfo.ResultMessage == 'OK') {
                            res.json({
                              success: true
                            })
                          }
                          else {
                            res.json({
                              success: false,
                              message: userInfo.ResultMessage
                            })
                          }
                        }
                      });
                    }
                    else {
                      res.json({ error: 'Invalid credentials' });
                    }
                  } else {
                    console.log(_err)
                    res.json({ error: 'Invalid credentials' });
                  }
                });
                
              }
              else {
                res.json({
                  success: false,
                  message: userInfo.ResultMessage
                })
              }
            }
          });
        }
        else {
          res.json({ error: 'Invalid credentials' });
        }
      } else {
        console.log(_err)
        res.json({ error: 'Invalid credentials' });
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.json({ error: 'Invalid credentials' });
  }
}

function getCurrentTime(req, res) {
  const currentTime = new Date().toLocaleTimeString();
  res.json({ currentTime });
}

module.exports = { login, register, logout, generateJWTtoken, result, getUserInfo, getBotInfo, setLog, getCurrentTime };
