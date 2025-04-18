const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// User schema
const userSchema = new mongoose.Schema({
  id:       { type: String, default: uuidv4 },
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  date:     { type: Date, default: Date.now }
});

// Event schema
const eventSchema = new mongoose.Schema({
  id:          { type: String, default: uuidv4 },
  name:        { type: String, required: true },
  userId:      { type: String, required: true },
  date:        { type: Date, required: true },
  capacity:    { type: Number, default: 0 },
  description: { type: String, default: '' },
  locationId:  { type: String, required: true }
});

// Question schema
const questionSchema = new mongoose.Schema({
  id:           { type: String, default: uuidv4 },
  text:         { type: String, required: true },
  eventId:      { type: String, required: true },
  category:     { type: String, required: true },
  deckPhase:    { type: String, required: true },
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
  questionId:   { type: String, required: true },
  eventId:      { type: String, required: true },
  locationId:   { type: String, required: true },
  feedbackType: { type: String, required: true }, // 'like' or 'dislike'
  userId:       { type: String },
  date:         { type: Date, default: Date.now }
});

// Location schema
const locationSchema = new mongoose.Schema({
  id:   { type: String, default: uuidv4 },
  name: { type: String, required: true }
});

// Deck schema (now referencing Question IDs)
const deckSchema = new mongoose.Schema({
  id:         { type: String, default: uuidv4 },
  accessCode: { type: String, required: true },
  eventId:    { type: String, required: true },
  questions:  [{ type: String, ref: 'Question' }],
  date:       { type: Date, default: Date.now }
});

// Model registrations with overwrite guard
const User     = mongoose.models.User     || mongoose.model('User', userSchema);
const Event    = mongoose.models.Event    || mongoose.model('Event', eventSchema);
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
const Deck     = mongoose.models.Deck     || mongoose.model('Deck', deckSchema);

// Export all models
module.exports = {
  User,
  Event,
  Question,
  Feedback,
  Location,
  Deck
};
