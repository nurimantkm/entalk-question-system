// models.js - Enhanced data models for Entalk Question System

// User Model (existing)
class User {
  constructor(name, email, password) {
    this.id = generateId();
    this.name = name;
    this.email = email;
    this.password = password;
    this.date = new Date().toISOString();
  }
}

// Event Model (existing)
class Event {
  constructor(name, description, date, userId) {
    this.id = generateId();
    this.name = name;
    this.description = description;
    this.date = date;
    this.userId = userId;
    this.createdAt = new Date().toISOString();
  }
}

// Enhanced Question Model
class Question {
  constructor(text, eventId, category, deckPhase, isNovelty = false) {
    this.id = generateId();
    this.text = text;
    this.eventId = eventId;
    this.category = category; // Icebreaker, Personal, Opinion, Hypothetical, Reflective, Cultural
    this.deckPhase = deckPhase; // Warm-Up, Personal, Reflective, Challenge
    this.creationDate = new Date().toISOString();
    this.usageHistory = []; // Array of {locationId, date} objects
    this.performance = {
      views: 0,
      likes: 0,
      dislikes: 0,
      score: 0
    };
    this.isNovelty = isNovelty;
  }
  
  // Update question performance based on feedback
  updatePerformance(feedback) {
    this.performance.views++;
    if (feedback === 'like') {
      this.performance.likes++;
    } else if (feedback === 'dislike') {
      this.performance.dislikes++;
    }
    this.calculateScore();
  }
  
  // Calculate question score based on performance
  calculateScore() {
    // Like Rate
    const likeRate = this.performance.views > 0 ? 
      this.performance.likes / this.performance.views : 0;
    
    // Freshness Boost
    const ageInDays = (new Date() - new Date(this.creationDate)) / (1000 * 60 * 60 * 24);
    const freshnessBoost = Math.max(0, 1 - (ageInDays / 30)); // Boost for questions under 30 days
    
    // Base score
    let score = (likeRate * 0.7) + (freshnessBoost * 0.3);
    
    // Add small random factor for exploration
    score += Math.random() * 0.1;
    
    this.performance.score = score;
    return score;
  }
  
  // Record usage of this question at a location
  recordUsage(locationId) {
    this.usageHistory.push({
      locationId,
      date: new Date().toISOString()
    });
  }
  
  // Check if question was used at this location within days
  wasUsedRecently(locationId, days = 28) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.usageHistory.some(usage => {
      return usage.locationId === locationId && 
             new Date(usage.date) > cutoffDate;
    });
  }
}

// Feedback Model
class Feedback {
  constructor(questionId, eventId, locationId, feedback, userId = null) {
    this.id = generateId();
    this.questionId = questionId;
    this.eventId = eventId;
    this.locationId = locationId;
    this.date = new Date().toISOString();
    this.feedback = feedback; // 'like' or 'dislike'
    this.userId = userId; // Optional, for anonymous tracking
  }
}

// Location Model
class Location {
  constructor(name, dayOfWeek) {
    this.id = generateId();
    this.name = name; // Üsküdar, Bahçeşehir, etc.
    this.dayOfWeek = dayOfWeek; // 1 (Monday) through 6 (Saturday)
  }
}

// QuestionDeck Model
class QuestionDeck {
  constructor(eventId, locationId, questions) {
    this.id = generateId();
    this.eventId = eventId;
    this.locationId = locationId;
    this.date = new Date().toISOString();
    this.questions = questions; // Array of question IDs
    this.accessCode = generateAccessCode();
    this.active = true;
  }
}

// Helper function to generate unique IDs
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Helper function to generate access codes for QR
function generateAccessCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

module.exports = {
  User,
  Event,
  Question,
  Feedback,
  Location,
  QuestionDeck
};
