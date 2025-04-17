// models.js

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// User schema
theconst userSchema = new mongoose.Schema({
  id:        { type: String, default: uuidv4 },
  name:      String,
  email:     String,
  password:  String,
  date:      { type: Date, default: Date.now }
});

// Event schema
const eventSchema = new mongoose.Schema({
  id:         { type: String, default: uuidv4 },
  name:       String,
  userId:     String,
  date:       Date,
  capacity:   Number,
  description:String,
  locationId: String
});

// Question schema
const questionSchema = new mongoose.Schema({
  id:           { type: String, default: uuidv4 },
  text:         String,
  eventId:      String,
  category:     String,
  deckPhase:    String,
  creationDate: { type: Date, default: Date.now },
  usageHistory: [{ locationId: String, date: Date }],
  performance: {
    views:    { type: Number, default: 0 },
    likes:    { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    score:    { type: Number, default: 0 }
  },
  isNovelty:   { type: Boolean, default: false }
});

// Feedback schema
const feedbackSchema = new mongoose.Schema({
  id:           { type: String, default: uuidv4 },
  questionId:   String,
  eventId:      String,
  locationId:   String,
  feedbackType: String, // 'like' or 'dislike'
  userId:       String,
  date:         { type: Date, default: Date.now }
});

// Location schema
const locationSchema = new mongoose.Schema({
  id:   { type: String, default: uuidv4 },
  name: String
});

// Deck schema (now referencing Question IDs)
const deckSchema = new mongoose.Schema({
  id:         { type: String, default: uuidv4 },
  accessCode: String,
  eventId:    String,
  questions:  [{ type: String, ref: 'Question' }],
  date:       { type: Date, default: Date.now }
});

// Model registrations
const User     = mongoose.model('User', userSchema);
const Event    = mongoose.model('Event', eventSchema);
const Question = mongoose.model('Question', questionSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Location = mongoose.model('Location', locationSchema);
const Deck     = mongoose.model('Deck', deckSchema);

// Export all models
module.exports = {
  User,
  Event,
  Question,
  Feedback,
  Location,
  Deck
};
