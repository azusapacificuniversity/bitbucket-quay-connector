module.exports = (/*options*/) => {
  // Set some Variables.
  const express = require('express');
  const app = express();
  const bodyParser = require('body-parser');
  const config = require('./config.json');
  const https = require('https');
  const axios = require('axios');
  const crypto = require('crypto');
  const fs = require('fs');
  let instance;
  app.use(bodyParser.json());
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
  // Verification function to check if it is actually Bitbucket who is POSTing here
  const verifyBitbucket = (req) => {
    if (!req.headers['user-agent'].includes('Bitbucket')) {
      return false;
    }
    // Compare their hmac signature to our hmac signature
    // (hmac = hash-based message authentication code)
    const theirSignature = req.headers['x-hub-signature'];
    if (theirSignature == null) {
      return false;
    }
    const payload = JSON.stringify(req.body);
    const secret = process.env.SERVER_SECRET
    const ourSignature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
    return crypto.timingSafeEqual(Buffer.from(theirSignature), Buffer.from(ourSignature));
  };
  // Function for if we're not Authorized.
  const notAuthorized = (req, res) => {
    console.log('The Secret Key was wrong or missing.');
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    res.end('HMAC signature was missing or incorrect.');
  };

  // This function POSTs to Quay.
  const authorizationSuccessful = (payload) => {
    console.log('Bitbucket has authenticated.');
    // Build a new payload that quay can consume.
    var quaypayload = {"commit":payload.changes[0].toHash,"ref":payload.changes[0].ref.id,"default_branch":payload.changes[0].ref.displayId};
    // Make the POST request to the url in the config.
    // Set different options if we're using our own CA.
    if (process.env.QUAY_CA_FILE){
      var quayoptions = {
        json: quaypayload,
        agentOptions: {
          ca: fs.readFileSync(`/project/user-app/${process.env.QUAY_CA_FILE}`)
        }
      }
    } else {
      json: quayoptions
    }
    instance.post(config[payload.repository.name], quaypayload, (error, res, body) => {
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
      if (verifyBitbucket(req)) {
        // Bitbucket called with the right secret
        // Pull the payload out of the request.
        var payload = req.body
        // See if the config has an entry for the POSTing repository.
        if (config.hasOwnProperty(payload.repository.name)){
          // We know where to direct the QUAY payload.
          authorizationSuccessful(payload);
          // Quay was already updated. Respond to Bitbucket.
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Thanks Bitbucket <3');
        } else {
          // Error because we don't have this repo in the config.
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(`${payload.repository.name} has not been added to the config. Please see the README.md on how to configure access for this repo.`);
        }
      } else {
        // Someone else calling
        notAuthorized(req, res);
      }
    }
  });

  return app;
};
