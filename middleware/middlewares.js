const jwt = require('jsonwebtoken');
const { secretKey } = require('../config/config');
const request = require('request');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');


function authenticateToken(req, res, next) {
  let tokenID = req.query.t;
  let gameID = 1;

  if (tokenID == null && req.body.t != undefined) {
    tokenID = req.body.t;
  }

  if (req.query.e != undefined) {
    next();
    return;
  }

  if (tokenID == null) {
    const errorMessage = 'Token not found'; // userInfo.ResultMessage;
    const errorHtml = fs.readFileSync(path.join(__dirname, '../public', 'error.html'), 'utf8');
    const htmlWithErrorMessage = errorHtml.replace('{{ errorMessage }}', errorMessage);
    return res.status(400).send(htmlWithErrorMessage);
  }

  
  // const tokenID = '{EAA59E46-E72C-49CE-8364-20E49FDAB436}'; {426CD192-9C91-4B3E-9753-33F8CE733CC2}
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
            <env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="urn:Player1.Intf-IPlayer1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:enc="http://www.w3.org/2003/05/soap-encoding" xmlns:ns2="urn:CommonWSTypes">
            <env:Body>
            <ns1:`+func_name+` env:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
            <tokenID xsi:type="xsd:string">`+tokenID+`</tokenID>
            <gameID xsi:type="xsd:int">`+gameID+`</gameID>
            <Fields enc:itemType="xsd:string" enc:arraySize="3" xsi:type="ns2:ArrayOfString">
            <item xsi:type="xsd:string">e.EntityId</item>
            <item xsi:type="xsd:string">c.countryname</item>
            <item xsi:type="xsd:string">ef.fileData</item>
            </Fields>
            </ns1:`+func_name+`>
            </env:Body>
          </env:Envelope>
        `
  };

  
  try {
    request(soapOptions, function(_err, _resp) {
      if (_err == null) {
        if (_resp.statusCode == 200)
        {
          xml2js.parseString(_resp.body, async (err, result) => {
            if (err) {
                console.error('Error parsing XML response:', err);
                res.status(200).json({ error: 'Invalid credentials' });
            } else {
              try {
                const resultValue = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['NS1:'+func_name+'Response'][0]['return'][0]['_'];
                var userInfo = JSON.parse(resultValue)
    
                if (userInfo.ResultCode == undefined && userInfo.ResultMessage == undefined) {
                  
                  req.user = {
                    username: userInfo.Name, // userInfo.Name,
                    betUsd: userInfo.betUsd,
                    Status: userInfo.Status,
                    CountryName: userInfo.countryname,
                    TokenId: tokenID,
                    gameID: gameID,
                    entityId: userInfo.EntityId
                  }
                  next();
                }
                else {
                  const errorMessage = userInfo.ResultMessage;
                  const errorHtml = fs.readFileSync(path.join(__dirname, '../public', 'error.html'), 'utf8');
                  const htmlWithErrorMessage = errorHtml.replace('{{ errorMessage }}', errorMessage);
                  return res.status(400).send(htmlWithErrorMessage);
                }
              } catch (error_) {
                const errorMessage = 'Invalid Token'; // userInfo.ResultMessage;
                const errorHtml = fs.readFileSync(path.join(__dirname, '../public', 'error.html'), 'utf8');
                const htmlWithErrorMessage = errorHtml.replace('{{ errorMessage }}', errorMessage);
                return res.status(400).send(htmlWithErrorMessage);
              }
            }
          });
        }
        else {
          const errorMessage = 'Invalid Token'; // userInfo.ResultMessage;
          const errorHtml = fs.readFileSync(path.join(__dirname, '../public', 'error.html'), 'utf8');
          const htmlWithErrorMessage = errorHtml.replace('{{ errorMessage }}', errorMessage);
          return res.status(400).send(htmlWithErrorMessage);
        }
      } else {
        console.log(_err)
        const errorMessage = 'Invalid Token'; // userInfo.ResultMessage;
        const errorHtml = fs.readFileSync(path.join(__dirname, '../public', 'error.html'), 'utf8');
        const htmlWithErrorMessage = errorHtml.replace('{{ errorMessage }}', errorMessage);
        return res.status(400).send(htmlWithErrorMessage);
      }
    });
  } catch (error) {
    const errorMessage = 'Invalid Token'; // userInfo.ResultMessage;
    const errorHtml = fs.readFileSync(path.join(__dirname, '../public', 'error.html'), 'utf8');
    const htmlWithErrorMessage = errorHtml.replace('{{ errorMessage }}', errorMessage);
    return res.status(400).send(htmlWithErrorMessage);
  }

}

module.exports = { authenticateToken };
