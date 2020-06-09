module.exports = (/*options*/) => {
  // Set some Variables.
  const express = require('express');
  const app = express();
  const bodyParser = require('body-parser');
  const https = require('https');
  const axios = require('axios');
  const crypto = require('crypto');
  const fs = require('fs');
  const quayHost = process.env.QUAY_HOST;
  let instance;
  app.use(bodyParser.json());

  if (quayHost === null || quayHost === undefined) {
    throw(new Error("Quay host not found."));
  }
  // Check if we're using a custom cert.
  if (process.env.QUAY_CA_FILE){
    const cert = fs.readFileSync(`/project/user-app/${process.env.QUAY_CA_FILE}`)
    const httpsAgent = new https.Agent({ ca: cert });
    instance = axios.create({ httpsAgent });
    console.log(`Loaded custom cert for Quay: ${process.env.QUAY_CA_FILE}`)
  } else {
    instance = axios;
    console.log('No custom certs found.')
  };
  // Function for if we're not Authorized.
  const notAuthorized = (req, res) => {
    console.log('The Secret Key was wrong or missing.');
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('HMAC signature was missing or incorrect.');
  };

  // This function POSTs to Quay.
  const authorizationSuccessful = (payload, url, token) => {
    console.log('Bitbucket has authenticated.');
    // Build a new payload that quay can consume.
    var quaypayload = {"commit":payload.changes[0].toHash,"ref":payload.changes[0].ref.id,"default_branch":payload.changes[0].ref.displayId};
    // Make the POST request to the request url.
    instance.post('https://' + quayHost + url, quaypayload, {
            auth: {
                    username: '$token',
                    password: token
                }
            }, (error, res, body) => {
      if (error) {
        // Log errors if they exist.
        console.error(error)
        return
      }
      // Log the results.
      console.log(`statusCode: ${res.statusCode}`)
      console.log(body)
    })
  };

  // Set up the URI endpoints we can use:
  app.get('/', (req, res) => {
    // We use this for a readyness probe.
    req.log.info({message: 'Container is live.'});
    res.send('Container is live.');
  });

  app.post('/api', (req, res) => {
    if (req.headers['x-event-key'] == 'diagnostics:ping') {
      // This is a test and bitbucket doesn't send the HMAC, so we need to respond early.
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('pong - Please note that the server secret was not tested as a part of this test.');
    } else {
        // See if the req.query has the property token
        if (req.query.hasOwnProperty("token")){
          // We know where to direct the QUAY payload.
          authorizationSuccessful(req.body, req.originalUrl, req.query.token);
          // Quay was already updated. Respond to Bitbucket.
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('');
        } else {
          // Error because we don't have this repo in the config.
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(`No token param found in request's query param(s)`);
        }
    }
  });

  return app;
};
