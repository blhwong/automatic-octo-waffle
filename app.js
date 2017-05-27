var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var passport = require('passport');
var path = require('path');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

app.use(require('morgan')('dev'));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: '774516533381-qtrivh6al97vulcsbdqsvfi9u8i610gt.apps.googleusercontent.com',
  clientSecret: 'xfjWd-8GlaUgiWLyMTBbUz74',
  callbackURL: 'http://localhost:3007/auth/google/callback',
  scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar']
},
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      return done(null, profile);
    });
  }
));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/calendar-events', (req, res) => {
  res.send('calendar-events');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar'] }));

app.get( '/auth/google/callback',
    passport.authenticate( 'google', {
      failureRedirect: '/auth/google/failure'
    }), (req, res) => {
      res.redirect('/auth/google/success');
    });

app.get('/auth/google/success', (req, res) => {
  res.send('success login in');
});

app.get('/auth/google/failure', (req, res) => {
  res.send('failure log in');
});

app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(3007, function () {
  console.log('Example app listening on port 3007!');
  console.log('http://localhost:3007/');
});
