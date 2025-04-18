// Load environment variables
const path = require('path');
const express = require('express');
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Entalk...';
const JWT_SECRET = process.env.JWT_SECRET || 'entalk_jwt_secret_key_production';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateNoveltyQuestions } = require('./openaiService');
const { generateQuestionDeck } = require('./questionService');

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
// Import centralized models
const { User, Event, Question, Feedback, Location, Deck } = require('./models');

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected!'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(express.static('public'));

// Middleware for token authentication
type authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'EnTalk Questions Tool API using MongoDB', version: '1.0.0' });
});

// === USER AUTH ===
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email in use' });
    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashed });
    await newUser.save();
    const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
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
    if (!user) return res.status(400).json({ error: 'Invalid creds' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid creds' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Logged in', token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// === EVENTS ===
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
      locations = [
        { id: 'loc1', name: 'Üsküdar' },
        { id: 'loc2', name: 'Bahçeşehir' },
        { id: 'loc3', name: 'Bostancı' }
      ];
      await Location.insertMany(locations);
    }
    res.json(locations);
  } catch (err) {
    console.error('Get locations error:', err);
    res.status(500).json({ error: 'Failed to retrieve locations' });
  }
});

// === QUESTIONS ===
app.post('/api/questions', authenticateToken, async (req, res) => {
  // ... unchanged question creation/generation logic ...
});

app.get('/api/questions/:eventId', authenticateToken, async (req, res) => {
  // ... unchanged feedback-augmented retrieval ...
});

// === DECK GENERATION ===
app.post('/api/events/:eventId/deck', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) return res.status(400).json({ error: 'Event ID required' });
    const event = await Event.findOne({ id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    const deckData = await generateQuestionDeck(event.locationId, eventId);
    const newDeck = new Deck({ accessCode: uuidv4(), eventId, questions: deckData.questions });
    await newDeck.save();
    res.json(newDeck);
  } catch (err) {
    console.error('Generate deck error:', err);
    res.status(500).json({ error: 'Failed to generate deck' });
  }
});

// === PARTICIPANT VIEW ===
app.get('/api/decks/:accessCode', async (req, res) => {
  // ... unchanged deck retrieval for participants ...
});

// === FEEDBACK ===
app.post('/api/feedback', async (req, res) => {
  // ... unchanged feedback storage ...
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
