// models.js - Mongoose models for Entalk Question System

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  name: String,
  email: String,
  password: String,
  date: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  name: String,
  description: String,
  date: Date,
  userId: String,
  createdAt: { type: Date, default: Date.now }
});

const questionSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  text: String,
  eventId: String,
  category: String,
  deckPhase: String,
  creationDate: { type: Date, default: Date.now },
  usageHistory: [{ locationId: String, date: Date }],
  performance: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    score: { type: Number, default: 0 }
  },
  isNovelty: { type: Boolean, default: false }
});

// Add methods to the question schema
questionSchema.methods.updatePerformance = function(feedback) {
  this.performance.views++;
  if (feedback === 'like') {
    this.performance.likes++;
  } else if (feedback === 'dislike') {
    this.performance.dislikes++;
  }
  this.calculateScore();
};

questionSchema.methods.calculateScore = function() {
  const likeRate = this.performance.views > 0 ? 
    this.performance.likes / this.performance.views : 0;
  const ageInDays = (new Date() - new Date(this.creationDate)) / (1000 * 60 * 60 * 24);
  const freshnessBoost = Math.max(0, 1 - (ageInDays / 30));
  let score = (likeRate * 0.7) + (freshnessBoost * 0.3);
  score += Math.random() * 0.1;
  this.performance.score = score;
  return score;
};

questionSchema.methods.recordUsage = function(locationId) {
  this.usageHistory.push({
    locationId,
    date: new Date()
  });
};

questionSchema.methods.wasUsedRecently = function(locationId, days = 28) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.usageHistory.some(usage => {
    return usage.locationId === locationId && 
           usage.date > cutoffDate;
  });
};

const feedbackSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  questionId: String,
  eventId: String,
  locationId: String,
  feedback: String, // 'like' or 'dislike'
  userId: { type: String, default: null },
  date: { type: Date, default: Date.now }
});

const locationSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  name: String,
  dayOfWeek: Number
});

const questionDeckSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  eventId: String,
  locationId: String,
  date: { type: Date, default: Date.now },
  questions: [{ type: String }], // Array of question IDs
  accessCode: String,
  active: { type: Boolean, default: true }
});

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const Question = mongoose.model('Question', questionSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Location = mongoose.model('Location', locationSchema);
const QuestionDeck = mongoose.model('QuestionDeck', questionDeckSchema);

module.exports = {
  User,
  Event,
  Question,
  Feedback,
  Location,
  QuestionDeck
};
