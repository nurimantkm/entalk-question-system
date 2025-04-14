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

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoConnected ? 'connected' : 'disconnected',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    locations: global.locations.length
  });
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = global.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = new User(name, email, hashedPassword);
    global.users.push(newUser);
    
    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login
app.post('/api/auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const user = global.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create event
app.post('/api/events', authenticateToken, (req, res) => {
  try {
    const { name, date, capacity } = req.body;
    const userId = req.user.id;
    
    if (!name) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    
    // Create new event
    const newEvent = new Event(name, userId, date, capacity);
    global.events.push(newEvent);
    
    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent
    });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Event creation failed' });
  }
});

// Get user's events
app.get('/api/events', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user's events
    const userEvents = global.events.filter(e => e.userId === userId);
    
    res.json(userEvents);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
});

// Get all locations
app.get('/api/locations', (req, res) => {
  try {
    const locations = global.locations;
    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to retrieve locations' });
  }
});

// Generate questions
app.post('/api/questions', authenticateToken, async (req, res) => {
  try {
    const { eventId, topic, count, category, deckPhase } = req.body;
    
    if (!eventId || !topic || !category || !deckPhase) {
      return res.status(400).json({ 
        error: 'Event ID, topic, category, and deck phase are required' 
      });
    }
    
    // Validate event exists and belongs to user
    const event = global.events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to access this event' });
    }
    
    // Generate questions
    let questions;
    try {
      questions = await openaiService.generateQuestions(
        topic, 
        count || 5, 
        category, 
        deckPhase
      );
    } catch (error) {
      console.error('Error generating questions with OpenAI:', error);
      // Use fallback mock questions
      questions = generateMockQuestions(topic, count || 5, category, deckPhase);
    }
    
    // Save questions
    const savedQuestions = questionService.createQuestions(questions, eventId);
    
    res.json({
      message: 'Questions generated successfully',
      questions: savedQuestions
    });
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Generate question deck
app.post('/api/decks', authenticateToken, async (req, res) => {
  try {
    const { eventId, locationId } = req.body;
    
    if (!eventId || !locationId) {
      return res.status(400).json({ 
        error: 'Event ID and location ID are required' 
      });
    }
    
    // Validate event exists and belongs to user
    const event = global.events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to access this event' });
    }
    
    // Validate location exists
    const location = global.locations.find(l => l.id === locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Generate deck
    const deck = await questionService.generateQuestionDeck(locationId, eventId);
    
    res.json({
      message: 'Question deck generated successfully',
      deck
    });
  } catch (error) {
    console.error('Generate deck error:', error);
    res.status(500).json({ error: 'Failed to generate question deck' });
  }
});

// Record question feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { questionId, eventId, locationId, feedbackType, userId } = req.body;
    
    if (!questionId || !eventId || !locationId || !feedbackType) {
      return res.status(400).json({ 
        error: 'Question ID, event ID, location ID, and feedback type are required' 
      });
    }
    
    // Record feedback
    const feedback = questionService.recordFeedback(
      questionId, 
      eventId, 
      locationId, 
      feedbackType, 
      userId
    );
    
    res.json({
      message: 'Feedback recorded successfully',
      feedback
    });
  } catch (error) {
    console.error('Record feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get feedback for event
app.get('/api/feedback/:eventId', authenticateToken, (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Validate event exists and belongs to user
    const event = global.events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to access this event' });
    }
    
    // Get questions for this event
    const eventQuestions = global.questions.filter(q => q.eventId === eventId);
    
    // Get feedback stats for each question
    const feedbackStats = eventQuestions.map(q => ({
      question: q,
      stats: questionService.getFeedbackStats(q.id)
    }));
    
    res.json(feedbackStats);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});

// Get question categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = questionService.getQuestionCategories();
    const categoriesWithDescriptions = categories.map(category => ({
      name: category,
      description: questionService.getCategoryDescription(category)
    }));
    
    res.json(categoriesWithDescriptions);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// Get deck phases
app.get('/api/phases', (req, res) => {
  try {
    const phases = questionService.getDeckPhases();
    const phasesWithDescriptions = phases.map(phase => ({
      name: phase,
      description: questionService.getPhaseDescription(phase)
    }));
    
    res.json(phasesWithDescriptions);
  } catch (error) {
    console.error('Get phases error:', error);
    res.status(500).json({ error: 'Failed to retrieve phases' });
  }
});

// Debug endpoint to create a test user (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/debug/create-test-user', async (req, res) => {
    try {
      const name = 'Test User';
      const email = 'test@example.com';
      const password = 'test123';
      
      // Check if user already exists
      const existingUser = global.users.find(u => u.email === email);
      if (existingUser) {
        return res.json({ 
          message: 'Test user already exists',
          user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email
          }
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user
      const newUser = new User(name, email, hashedPassword);
      global.users.push(newUser);
      
      // Create test event
      const eventName = 'Test Event';
      const eventDate = new Date().toISOString();
      const eventCapacity = 20;
      
      const newEvent = new Event(eventName, newUser.id, eventDate, eventCapacity);
      global.events.push(newEvent);
      
      res.status(201).json({
        message: 'Test user and event created successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          password: 'test123' // Only included for testing
        },
        event: newEvent
      });
    } catch (error) {
      console.error('Create test user error:', error);
      res.status(500).json({ error: 'Failed to create test user' });
    }
  });
}

// Fallback mock question generator
function generateMockQuestions(topic, count, category, deckPhase) {
  const mockQuestions = [];
  
  for (let i = 0; i < count; i++) {
    mockQuestions.push({
      text: `What do you think about ${topic} in relation to everyday life? (Mock question ${i+1})`,
      category,
      deckPhase,
      isNovelty: false
    });
  }
  
  return mockQuestions;
}

// Serve HTML for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
