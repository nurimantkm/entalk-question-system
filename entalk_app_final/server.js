// server.js

// Load environment variables
require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Centralized Mongoose models
const { User, Event, Question, Feedback, Location, Deck } = require('./models');
// OpenAI & business logic
const { generateNoveltyQuestions } = require('./openaiService');
const { generateQuestionDeck } = require('./questionService');

// Configuration
const MONGO_URI     = process.env.MONGO_URI || process.env.MONGODB_URI;
const JWT_SECRET    = process.env.JWT_SECRET || 'entalk_jwt_secret_key_production';
const OPENAI_API_KEY= process.env.OPENAI_API_KEY || '';

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize Express
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
tunction authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Base route
app.get('/api', (req, res) => {
  res.json({ message: 'EnTalk Questions Tool API using MongoDB', version: '1.0.0' });
});

// === USER AUTH ===
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user   = new User({ name, email, password: hashed });
    await user.save();
    const token  = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'User registered', token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Logged in', token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// === EVENTS ===
// Create event
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { name, description, date, locationId } = req.body;
    const event = new Event({ name, description, date, locationId, userId: req.user.id });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// List events for user
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user.id });
    res.json(events);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
});

// === LOCATIONS ===
app.get('/api/locations', async (req, res) => {
  try {
    let locations = await Location.find();
    if (!locations.length) {
      const defaults = [
        { id: 'loc1', name: 'Üsküdar' },
        { id: 'loc2', name: 'Bahçeşehir' },
        { id: 'loc3', name: 'Bostancı' }
      ];
      await Location.insertMany(defaults);
      locations = defaults;
    }
    res.json(locations);
  } catch (err) {
    console.error('Get locations error:', err);
    res.status(500).json({ error: 'Failed to retrieve locations' });
  }
});

// === QUESTIONS ===
app.post('/api/questions', authenticateToken, async (req, res) => {
  /* question creation & AI generation logic unchanged */
});

app.get('/api/questions/:eventId', authenticateToken, async (req, res) => {
  /* feedback-augmented question retrieval logic unchanged */
});

// === DECK GENERATION ===
app.post('/api/events/:eventId/deck', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event       = await Event.findOne({ id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    // Generate deck purely by event
    const deckData = await generateQuestionDeck(event);

    const newDeck = new Deck({
      accessCode: uuidv4(),
      eventId,
      questions: deckData.questions.map(q => q.id),
      date: new Date()
    });
    await newDeck.save();
    res.json(newDeck);
  } catch (err) {
    console.error('Generate deck error:', err);
    res.status(500).json({ error: 'Failed to generate deck' });
  }
});

// === PARTICIPANT VIEW ===
app.get('/api/decks/:accessCode', async (req, res) => {
  /* deck retrieval logic unchanged */
});

// === FEEDBACK ===
app.post('/api/feedback', authenticateToken, async (req, res) => {
  /* feedback storage logic unchanged */
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
