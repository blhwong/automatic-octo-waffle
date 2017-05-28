const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path');
const config = require('./config');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const axios = require('axios');
const uuidV4 = require('uuid/v4');
const db = require('./db');

app.use(require('morgan')('dev'));

let localStorage = {};

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.use(bodyParser.json());
app.use(require('express-session')({
  secret: config.secret,
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: config.clientID,
  clientSecret: config.clientSecret,
  callbackURL: 'http://localhost:3007/auth/google/callback',
  scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar']
},
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      localStorage.accessToken = accessToken;
      localStorage.refreshToken = refreshToken;
      localStorage.email = profile.emails[0].value;
      return done(null, profile);
    });
  }
));

checkAuthentication = (req, res, next) => {
  if (req.isAuthenticated()) {
    //if user is loged in, req.isAuthenticated() will return true
    next();
  } else {
    res.redirect('/auth/google');
  }
};

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/calendar-events', checkAuthentication, (req, res) => {
  db.User.findOne({email: localStorage.email})
  .then((user) => {
    if (!user) {
    //get list from api
      var auth = new googleAuth();
      var oauth2Client = new auth.OAuth2(config.clientID, config.clientSecret, 'http://localhost:3007/auth/google/callback');
      oauth2Client.credentials = {
        access_token: localStorage.accessToken,
        refresh_token: localStorage.refreshToken
      };
      var calendar = google.calendar('v3');
      calendar.events.list({
        auth: oauth2Client,
        calendarId: localStorage.email,
        timeMin: (new Date()).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      }, function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          res.sendStatus(400); //error getting data from api
        }
        // create webhook
        calendar.events.watch({
          auth: oauth2Client,
          calendarId: 'primary',
          resource: {
            address: `${config.address}/notification`,
            id: uuidV4(),
            kind: 'api#channel',
            type: 'web_hook'
          }
        }, {}, (err, watchResponse) => {
          if (err) {
            res.sendStatus(400); // error creating webhook
          }
          let user = new db.User({
            email: localStorage.email,
            response: JSON.stringify(response),
            watch: JSON.stringify(watchResponse),
            uuid: watchResponse.id,
            accessToken: localStorage.accessToken
          });
          user.save((err) => {
            if (err) {
              res.sendStatus(400); // error saving to db
            }
            //response from the api
            console.log('response from the api');
            res.send(response);
          });
        });
      });
    } else {
      // response from the db
      console.log('response from the db');
      res.send(JSON.parse(user.response));

    }

  }).catch((err) => {
    res.sendStatus(500).send(err);
  });

});

app.post('/notification', (req, res) => {
  let id = req.headers['x-goog-channel-id'];
  db.User.findOne({uuid: id})
  .then((user) => {
    if (!user) {
      res.sendStatus(404);
    } else {
      // get new listing
      var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(config.clientID, config.clientSecret, 'http://localhost:3007/auth/google/callback');
        oauth2Client.credentials = {
          access_token: user.accessToken,
        };
        var calendar = google.calendar('v3');
        calendar.events.list({
          auth: oauth2Client,
          calendarId: user.email,
          timeMin: (new Date()).toISOString(),
          singleEvents: true,
          orderBy: 'startTime'
        }, function(err, response) {
          if (err) {
            res.sendStatus(400); // error getting new listings
          } else {
            user.response = JSON.stringify(response);
            user.save((err) => {
              if (err) {
                res.sendStatus(500).send(err); // error saving to db
              } else {
                console.log('Successfully updated from webhook');
                res.sendStatus(201); // successfully updated from webhook

              }
            });
          }
        });
    }
  });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar'] }));

app.get( '/auth/google/callback',
    passport.authenticate( 'google', {
      failureRedirect: '/auth/google'
    }), (req, res) => {
      res.redirect('/calendar-events');
    });

// app.get('/auth/google/success', (req, res) => {
//   res.send('success login in');
// });

// app.get('/auth/google/failure', (req, res) => {
//   res.send('failure log in');
// });

app.get('/googlef35f57ffafa173dc.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'googlef35f57ffafa173dc.html'));
});

app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(3007, function () {
  console.log('Example app listening on port 3007!');
  console.log('http://localhost:3007/');
});
