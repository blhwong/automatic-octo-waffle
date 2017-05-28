const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/goodtime');
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to mongoDB');
});

const userSchema = new mongoose.Schema({
  email: String,
  response: String,
  watch: String,
  uuid: String,
  accessToken: String
});

const User = mongoose.model('User', userSchema);

module.exports.User = User;
