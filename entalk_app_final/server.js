// Fixed server.js to resolve circular dependency issues

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { User, Event, Question, Feedback, Location, QuestionDeck } = require('./models');

// Load environment variables
dotenv.config();

// Initialize global arrays if they don't exist
if (!global.users) global.users = [];
if (!global.events) global.events = [];
if (!global.questions) global.questions = [];
if (!global.feedback) global.feedback = [];
if (!global.locations) global.locations = [];
if (!global.questionDecks) global.questionDecks = [];

// Initialize MongoDB connection if credentials are provided
let mongoConnected = false;
if (process.env.MONGODB_URI) {
  try {
    // MongoDB connection would be initialized here
    console.log('MongoDB connection configured');
    mongoConnected = true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Falling back to in-memory data storage');
  }
} else {
  console.log('No MongoDB URI provided, using in-memory data storage');
}

// Initialize locations
function initializeLocations() {
  if (global.locations.length === 0) {
    const locationData = [
      { name: 'Üsküdar', dayOfWeek: 1 },
      { name: 'Bahçeşehir', dayOfWeek: 2 },
      { name: 'Bostancı', dayOfWeek: 3 },
      { name: 'Kadıköy', dayOfWeek: 4 },
      { name: 'Beşiktaş', dayOfWeek: 5 },
      { name: 'Mecidiyeköy', dayOfWeek: 6 }
    ];

    locationData.forEach(loc => {
      global.locations.push(new Location(loc.name, loc.dayOfWeek));
    });
    console.log(`Initialized ${global.locations.length} locations`);
  }
  return global.locations;
}

// Initialize locations at startup
initializeLocations();

// Import services - after initializing global arrays and locations
const questionService = require('./questionService');
const openaiService = require('./openaiService');

// Initialize OpenAI with API key from environment
if (process.env.OPENAI_API_KEY) {
  try {
    openaiService.initializeOpenAI(process.env.OPENAI_API_KEY);
    console.log('OpenAI initialized successfully');
  } catch (error) {
    console.error('Error initializing OpenAI:', error);
  }
}

// Initialize Express app
const app = express();

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Routes
app.use('/api', require('./routes'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
