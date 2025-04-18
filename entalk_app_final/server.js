// Load environment variables
const path = require('path');
const express = require('express');
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://EntalkAdmin:Pamyk3gara@entalk-cluster.hc0qztn.mongodb.net/?retryWrites=true&w=majority&appName=entalk-cluster';
const JWT_SECRET = process.env.JWT_SECRET || 'entalk_jwt_secret_key_production';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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'; // if provided, used in your OpenAI module
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateNoveltyQuestions } = require('./openaiService');
const { generateQuestionDeck } = require('./questionService');

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Log OpenAI key status
if (OPENAI_API_KEY) {
  console.log('OpenAI API key initialized.');
} else {
  console.log('OpenAI API key not provided.');
}

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import Mongoose models
const { User, Event, Question, Feedback, Location, Deck } = require('./models');

// Initialize Express app
app.use(express.json());
app.use(express.static('public'));

// Middleware for token authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'EnTalk Questions Tool API using MongoDB',
    version: '1.0.0'
  });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ id: uuidv4(), name, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Registration successful', token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });
    
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Protected routes (example: create event)
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    // your event creation logic here
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Generate deck
app.post('/api/events/:eventId/deck', authenticateToken, async (req, res) => {
  try {
    const deck = await generateQuestionDeck(req.params.eventId);
    res.json(deck);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
