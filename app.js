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

app.use(require('morgan')('dev'));

let localStorage = {};

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

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
      // console.log('profile', profile);
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
  // res.send('calendar-events');
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(config.clientID, config.clientSecret, 'http://localhost:3007/auth/google/callback');
  oauth2Client.credentials = {
    access_token: localStorage.accessToken,
    refresh_token: localStorage.refreshToken
  };
  console.log(oauth2Client);
  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: oauth2Client,
    calendarId: 'b.lh.wong@gmail.com'
    // timeMin: (new Date()).toISOString(),
    // maxResults: 10,
    // singleEvents: true,
    // orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      // return;
      // res.sendStatus(400);
    }
    console.log('response', response);
    res.send(response);
    // var events = response.items;
    // if (events.length == 0) {
    //   console.log('No upcoming events found.');
    // } else {
    //   console.log('Upcoming 10 events:');
    //   for (var i = 0; i < events.length; i++) {
    //     var event = events[i];
    //     var start = event.start.dateTime || event.start.date;
    //     console.log('%s - %s', start, event.summary);
    //   }
    // }
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

app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(3007, function () {
  console.log('Example app listening on port 3007!');
  console.log('http://localhost:3007/');
});
