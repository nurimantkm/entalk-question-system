// Updated server.js with CORS and dotenv integration

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import models and services
const { User, Event, Question } = require('./models');
const questionService = require('./questionService');
const openaiService = require('./openaiService');

// Initialize OpenAI with API key if available
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (OPENAI_API_KEY) {
  openaiService.initializeOpenAI(OPENAI_API_KEY);
  console.log('OpenAI service initialized');
} else {
  console.log('OpenAI API key not found, using mock data for question generation');
}

// Initialize global arrays for data storage
global.users = [];
global.events = [];
global.questions = [];
global.feedback = [];
global.locations = [];
global.questionDecks = [];

// Initialize locations
questionService.initializeLocations();

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to database (mock function for now)
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      // Use actual MongoDB if URI is provided
      console.log('Connecting to MongoDB...');
      // In a real implementation, this would connect to MongoDB
      console.log('MongoDB connection successful');
    } else {
      // Use in-memory storage otherwise
      console.log('Using in-memory storage (no MongoDB URI provided)');
    }
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Continue with in-memory storage as fallback
    return true;
  }
};

// Middleware for authentication
const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  
  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwtSecret');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Register User
app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    // Check if user exists
    let user = global.users.find(user => user.email === email);
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    
    // Create new user
    user = new User(name, email, password);
    
    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Save user
    global.users.push(user);
    
    // Return jsonwebtoken
    const payload = {
      user: {
        id: user.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'jwtSecret',
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login User
app.post('/api/auth', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Check if user exists
    let user = global.users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }
    
    // Return jsonwebtoken
    const payload = {
      user: {
        id: user.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'jwtSecret',
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get User
app.get('/api/auth/user', auth, async (req, res) => {
  try {
    const user = global.users.find(user => user.id === req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Don't send password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create Event
app.post('/api/events', auth, async (req, res) => {
  const { name, description, date, locationId } = req.body;
  try {
    const event = new Event(name, description, date, req.user.id);
    
    // Add locationId if provided
    if (locationId) {
      event.locationId = locationId;
    }
    
    global.events.push(event);
    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get Events
app.get('/api/events', auth, async (req, res) => {
  try {
    const events = global.events.filter(event => event.userId === req.user.id);
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get Event by ID
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = global.events.find(event => event.id === req.params.id);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Generate Questions
app.post('/api/questions/generate', auth, async (req, res) => {
  const { topic, count, category, deckPhase } = req.body;
  try {
    let questions;
    
    if (OPENAI_API_KEY) {
      // Generate questions using OpenAI
      questions = await openaiService.generateQuestions(
        topic,
        count || 5,
        category || 'Opinion',
        deckPhase || 'Reflective'
      );
    } else {
      // For local development without API key, use mock data
      const mockQuestions = [
        `What's your favorite aspect of ${topic}?`,
        `How has ${topic} changed in the last few years?`,
        `What challenges do you see in ${topic} today?`,
        `If you could change one thing about ${topic}, what would it be?`,
        `How do you think ${topic} will evolve in the future?`
      ];
      
      // Format questions with category and phase if provided
      questions = mockQuestions.map(q => ({
        text: q,
        category: category || 'Opinion',
        deckPhase: deckPhase || 'Reflective'
      }));
    }
    
    res.json({ questions });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Save Questions
app.post('/api/questions', auth, async (req, res) => {
  const { questions, eventId } = req.body;
  try {
    // Check if event exists and belongs to user
    const event = global.events.find(event => event.id === eventId);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    if (event.userId !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    // Save questions with enhanced data
    const savedQuestions = questionService.createQuestions(questions, eventId);
    res.json(savedQuestions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get Questions by Event ID
app.get('/api/questions/:eventId', async (req, res) => {
  try {
    const questions = global.questions.filter(question => question.eventId === req.params.eventId);
    res.json(questions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// NEW API ENDPOINTS FOR ENTALK QUESTION SYSTEM

// Get all question categories
app.get('/api/questions/categories', async (req, res) => {
  try {
    const categories = questionService.getQuestionCategories();
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all deck phases
app.get('/api/questions/phases', async (req, res) => {
  try {
    const phases = questionService.getDeckPhases();
    res.json(phases);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all locations
app.get('/api/locations', async (req, res) => {
  try {
    const locations = global.locations;
    res.json(locations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Record feedback for a question
app.post('/api/feedback', async (req, res) => {
  const { questionId, eventId, locationId, feedback, userId } = req.body;
  try {
    const result = questionService.recordFeedback(
      questionId,
      eventId,
      locationId,
      feedback,
      userId
    );
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get feedback statistics for a question
app.get('/api/feedback/stats/:questionId', async (req, res) => {
  try {
    const stats = questionService.getFeedbackStats(req.params.questionId);
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Generate a deck of questions for a location
app.post('/api/decks/generate/:locationId', auth, async (req, res) => {
  const { eventId } = req.body;
  try {
    // Check if event exists and belongs to user
    const event = global.events.find(event => event.id === eventId);
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    if (event.userId !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    const deck = await questionService.generateQuestionDeck(
      req.params.locationId,
      eventId
    );
    res.json(deck);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a deck by access code
app.get('/api/decks/:accessCode', async (req, res) => {
  try {
    const deck = questionService.getDeckByAccessCode(req.params.accessCode);
    res.json(deck);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get active deck for a location
app.get('/api/decks/active/:locationId', async (req, res) => {
  try {
    const deck = questionService.getActiveDeckForLocation(req.params.locationId);
    if (!deck) {
      return res.status(404).json({ msg: 'No active deck found for this location' });
    }
    res.json(deck);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Generate AI questions for specific categories and phases
app.post('/api/questions/generate-ai', auth, async (req, res) => {
  const { categories, phases, count, eventId, isNovelty } = req.body;
  try {
    let aiQuestions;
    
    if (OPENAI_API_KEY) {
      if (isNovelty) {
        // Generate novelty questions
        aiQuestions = await openaiService.generateNoveltyQuestions(count || 5);
      } else if (categories && categories.length > 0) {
        // Fill missing categories
        aiQuestions = await openaiService.fillMissingCategories(categories, count || 1);
      } else {
        // Generate regular questions with random categories and phases
        const allCategories = questionService.getQuestionCategories();
        const allPhases = questionService.getDeckPhases();
        
        aiQuestions = [];
        for (let i = 0; i < (count || 5); i++) {
          const category = categories ? 
            categories[i % categories.length] : 
            allCategories[Math.floor(Math.random() * allCategories.length)];
            
          const phase = phases ? 
            phases[i % phases.length] : 
            allPhases[Math.floor(Math.random() * allPhases.length)];
          
          aiQuestions.push({
            text: `AI generated ${category} question for ${phase} phase #${i+1}`,
            category,
            deckPhase: phase,
            isNovelty: false
          });
        }
      }
    } else {
      // Mock data for local development
      const allCategories = questionService.getQuestionCategories();
      const allPhases = questionService.getDeckPhases();
      
      aiQuestions = [];
      for (let i = 0; i < (count || 5); i++) {
        const category = categories ? 
          categories[i % categories.length] : 
          allCategories[Math.floor(Math.random() * allCategories.length)];
          
        const phase = phases ? 
          phases[i % phases.length] : 
          allPhases[Math.floor(Math.random() * allPhases.length)];
        
        aiQuestions.push({
          text: `AI generated ${category} question for ${phase} phase #${i+1}`,
          category,
          deckPhase: phase,
          isNovelty: isNovelty || false
        });
      }
    }
    
    // Save the generated questions if eventId is provided
    if (eventId) {
      const savedQuestions = questionService.createQuestions(aiQuestions, eventId);
      res.json(savedQuestions);
    } else {
      res.json(aiQuestions);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
});

// Add some sample data for testing
setTimeout(() => {
  // Create a test user
  const createTestUser = async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Entalk123!', salt);
    const user = new User('EnTalk Admin', 'admin@entalk.com', hashedPassword);
    global.users.push(user);
    console.log('Test user created:', user.email);
    
    // Create a test event
    const event = new Event('Sample Event', 'This is a sample event for testing', new Date().toISOString(), user.id);
    global.events.push(event);
    console.log('Test event created:', event.name);
    
    // Create sample questions with categories and phases
    const questionData = [
      {
        text: 'What brought you to this event today?',
        category: 'Icebreaker',
        deckPhase: 'Warm-Up'
      },
      {
        text: 'What\'s the most interesting project you\'ve worked on recently?',
        category: 'Personal',
        deckPhase: 'Personal'
      },
      {
        text: 'What\'s one skill you\'re currently trying to improve?',
        category: 'Reflective',
        deckPhase: 'Reflective'
      },
      {
        text: 'What\'s a book or podcast that has influenced your thinking?',
        category: 'Opinion',
        deckPhase: 'Challenge'
      },
      {
        text: 'What\'s something you\'re excited about for the future?',
        category: 'Hypothetical',
        deckPhase: 'Challenge'
      }
    ];
    
    questionService.createQuestions(questionData, event.id);
    console.log('Sample questions created');
    
    // Create a sample deck for the first location
    const location = global.locations[0];
    questionService.generateQuestionDeck(location.id, event.id)
      .then(deck => {
        console.log('Sample deck created for location:', location.name);
        console.log('Access code:', deck.accessCode);
      });
  };
  
  createTestUser();
}, 1000);

module.exports = app;
