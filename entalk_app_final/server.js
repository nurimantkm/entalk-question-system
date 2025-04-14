// Updated server.js with MongoDB integration and improved error handling

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('mongoose'); // Add mongoose for MongoDB

// Load environment variables
dotenv.config();

// Import services
const questionService = require('./questionService');
const openaiService = require('./openaiService');

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

// Initialize global data structures if they don't exist
global.users = global.users || [];
global.events = global.events || [];
global.questions = global.questions || [];
global.locations = global.locations || [];
global.decks = global.decks || [];
global.feedback = global.feedback || [];

// Connect to MongoDB
let mongoConnected = false;
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connected successfully');
    mongoConnected = true;
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Falling back to in-memory data storage');
  });
} else {
  console.log('No MongoDB URI provided, using in-memory data storage');
}

// Initialize OpenAI service if API key is available
let openaiInitialized = false;
try {
  if (process.env.OPENAI_API_KEY) {
    openaiService.initializeOpenAI(process.env.OPENAI_API_KEY);
    openaiInitialized = true;
    console.log('OpenAI service initialized');
  } else {
    console.log('OpenAI API key not found, AI features will be limited');
  }
} catch (error) {
  console.error('Error initializing OpenAI service:', error);
}

// Initialize data
const { User, Event } = require('./models');
questionService.initializeLocations();

// Create test data if in development mode
if (process.env.NODE_ENV === 'development') {
  // Create test user if none exists
  if (global.users.length === 0) {
    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('Entalk123!', salt);
    
    const testUser = new User('Admin', 'admin@entalk.com', hashedPassword);
    global.users.push(testUser);
    console.log('Test user created:', testUser.email);
  }
  
  // Create test event if none exists
  if (global.events.length === 0) {
    const testEvent = new Event('Sample Event', 'A sample event for testing', new Date(), 'loc1');
    global.events.push(testEvent);
    console.log('Test event created:', testEvent.name);
  }
  
  // Create sample questions if none exist
  if (global.questions.length === 0) {
    const sampleQuestions = [
      {
        text: 'What is your favorite hobby and why?',
        category: 'Personal',
        deckPhase: 'Warm-Up',
        isNovelty: false
      },
      {
        text: 'If you could travel anywhere in the world, where would you go?',
        category: 'Hypothetical',
        deckPhase: 'Personal',
        isNovelty: false
      },
      {
        text: 'What is the most interesting book you have read recently?',
        category: 'Opinion',
        deckPhase: 'Reflective',
        isNovelty: false
      }
    ];
    
    const eventId = global.events[0].id;
    questionService.createQuestions(sampleQuestions, eventId);
    console.log('Sample questions created');
    
    // Create sample deck
    (async () => {
      try {
        const deck = await questionService.generateQuestionDeck('loc1', eventId);
        console.log('Sample deck created for location: Üsküdar');
        console.log('Access code:', deck.accessCode);
      } catch (error) {
        console.error('Error creating sample deck:', error);
      }
    })();
  }
}

// Authentication middleware
function auth(req, res, next) {
  const token = req.header('x-auth-token');
  
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'entalk_jwt_secret_key_default');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

// Routes

// Auth routes
app.post('/api/auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }
    
    // Find user by email
    const user = global.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(400).json({ msg: 'User does not exist' });
    }
    
    // Validate password
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
      
      // Create JWT
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'entalk_jwt_secret_key_default',
        { expiresIn: 3600 }
      );
      
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Password comparison error:', error);
      res.status(500).json({ msg: 'Server error during authentication' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// User routes
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }
    
    // Check if user already exists
    const existingUser = global.users.find(u => u.email === email);
    
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = new User(name, email, hashedPassword);
    global.users.push(user);
    
    // Create JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'entalk_jwt_secret_key_default',
      { expiresIn: 3600 }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ msg: 'Server error during registration' });
  }
});

// Event routes
app.get('/api/events', auth, (req, res) => {
  try {
    res.json(global.events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ msg: 'Server error fetching events' });
  }
});

app.post('/api/events', auth, (req, res) => {
  try {
    const { name, description, date, locationId } = req.body;
    
    if (!name || !description || !date || !locationId) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }
    
    const event = new Event(name, description, new Date(date), locationId);
    global.events.push(event);
    
    res.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ msg: 'Server error creating event' });
  }
});

// Location routes
app.get('/api/locations', auth, (req, res) => {
  try {
    res.json(global.locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ msg: 'Server error fetching locations' });
  }
});

// Question routes
app.get('/api/questions/categories', auth, (req, res) => {
  try {
    res.json(questionService.getQuestionCategories());
  } catch (error) {
    console.error('Error fetching question categories:', error);
    res.status(500).json({ msg: 'Server error fetching question categories' });
  }
});

app.get('/api/questions/phases', auth, (req, res) => {
  try {
    res.json(questionService.getDeckPhases());
  } catch (error) {
    console.error('Error fetching deck phases:', error);
    res.status(500).json({ msg: 'Server error fetching deck phases' });
  }
});

app.get('/api/questions/:eventId', auth, (req, res) => {
  try {
    const { eventId } = req.params;
    
    const questions = global.questions.filter(q => q.eventId === eventId);
    
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ msg: 'Server error fetching questions' });
  }
});

app.post('/api/questions', auth, (req, res) => {
  try {
    const { questions, eventId } = req.body;
    
    if (!questions || !eventId) {
      return res.status(400).json({ msg: 'Please provide questions and event ID' });
    }
    
    const createdQuestions = questionService.createQuestions(questions, eventId);
    
    res.json(createdQuestions);
  } catch (error) {
    console.error('Error creating questions:', error);
    res.status(500).json({ msg: 'Server error creating questions' });
  }
});

// Generate questions with OpenAI
app.post('/api/questions/generate', auth, async (req, res) => {
  try {
    const { topic, count, category, deckPhase } = req.body;
    
    if (!topic || !count || !category || !deckPhase) {
      return res.status(400).json({ msg: 'Please provide topic, count, category, and deck phase' });
    }
    
    let questions;
    
    if (openaiInitialized) {
      // Use OpenAI to generate questions
      questions = await openaiService.generateQuestions(topic, count, category, deckPhase);
    } else {
      // Use mock data if OpenAI is not available
      questions = [];
      for (let i = 0; i < count; i++) {
        questions.push({
          text: `What do you think about ${topic} in relation to everyday life? (Mock question ${i+1})`,
          category,
          deckPhase,
          isNovelty: false
        });
      }
    }
    
    res.json({ questions });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ msg: 'Error generating questions', error: error.message });
  }
});

// Generate AI questions
app.post('/api/questions/generate-ai', auth, async (req, res) => {
  try {
    const { count } = req.body;
    
    if (!count) {
      return res.status(400).json({ msg: 'Please provide count' });
    }
    
    let questions;
    
    if (openaiInitialized) {
      // Use OpenAI to generate novelty questions
      questions = await openaiService.generateNoveltyQuestions(count);
    } else {
      // Use mock data if OpenAI is not available
      const categories = questionService.getQuestionCategories();
      const phases = questionService.getDeckPhases();
      
      questions = [];
      for (let i = 0; i < count; i++) {
        questions.push({
          text: `What's something unexpected you've learned recently? (Mock novelty question ${i+1})`,
          category: categories[Math.floor(Math.random() * categories.length)],
          deckPhase: phases[Math.floor(Math.random() * phases.length)],
          isNovelty: true
        });
      }
    }
    
    res.json({ questions });
  } catch (error) {
    console.error('Error generating AI questions:', error);
    res.status(500).json({ msg: 'Error generating AI questions', error: error.message });
  }
});

// Deck routes
app.post('/api/decks/generate/:locationId', auth, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { eventId } = req.body;
    
    if (!locationId || !eventId) {
      return res.status(400).json({ msg: 'Please provide location ID and event ID' });
    }
    
    const deck = await questionService.generateQuestionDeck(locationId, eventId);
    
    res.json(deck);
  } catch (error) {
    console.error('Error generating deck:', error);
    res.status(500).json({ msg: 'Error generating deck', error: error.message });
  }
});

// Get deck by access code
app.get('/api/decks/:accessCode', (req, res) => {
  try {
    const { accessCode } = req.params;
    
    const deck = questionService.getDeckByAccessCode(accessCode);
    
    res.json(deck);
  } catch (error) {
    console.error('Error getting deck:', error);
    res.status(404).json({ msg: 'Deck not found', error: error.message });
  }
});

// Feedback routes
app.post('/api/feedback', (req, res) => {
  try {
    const { questionId, eventId, locationId, feedbackType, userId } = req.body;
    
    if (!questionId || !eventId || !locationId || !feedbackType) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }
    
    const feedback = questionService.recordFeedback(
      questionId,
      eventId,
      locationId,
      feedbackType,
      userId
    );
    
    res.json(feedback);
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ msg: 'Error recording feedback', error: error.message });
  }
});

// Get feedback stats for a question
app.get('/api/feedback/stats/:questionId', auth, (req, res) => {
  try {
    const { questionId } = req.params;
    
    const stats = questionService.getFeedbackStats(questionId);
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({ msg: 'Error getting feedback stats', error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongoConnected,
    openaiInitialized,
    usersCount: global.users.length,
    eventsCount: global.events.length,
    questionsCount: global.questions.length
  });
});

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ msg: 'Server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
