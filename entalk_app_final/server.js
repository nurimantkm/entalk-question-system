// Enhanced server.js with persistent storage for Render.com free tier
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Initialize app
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Server startup logging
console.log('Server starting...');
console.log('Current directory:', __dirname);

// Data persistence configuration - use Render.com's persistent disk
let DATA_DIR = '/var/data/entalk';
console.log('Initial data directory path:', DATA_DIR);

// Ensure data directory exists with proper error handling
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory at ${DATA_DIR}`);
  }
} catch (error) {
  console.error(`Error creating data directory: ${error.message}`);
  // Fallback to a directory we know should work
  DATA_DIR = path.join(__dirname, 'data');
  console.log(`Falling back to data directory: ${DATA_DIR}`);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created fallback data directory at ${DATA_DIR}`);
  }
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.json');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

// Environment variables for fallback storage
const EVENTS_ENV_VAR = 'ENTALK_EVENTS_DATA';

// Initialize global data
global.users = [];
global.events = [];
global.locations = [];
global.questions = [];
global.feedback = [];
global.decks = []; // NEW: to store generated decks

// Load data from files if they exist
function loadData() {
  try {
    console.log('Attempting to load data from files...');
    
    if (fs.existsSync(USERS_FILE)) {
      global.users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      console.log(`Loaded ${global.users.length} users from file`);
    }
    
    if (fs.existsSync(EVENTS_FILE)) {
      global.events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
      console.log(`Loaded ${global.events.length} events from file`);
    } else if (process.env[EVENTS_ENV_VAR]) {
      try {
        global.events = JSON.parse(process.env[EVENTS_ENV_VAR]);
        console.log(`Loaded ${global.events.length} events from environment variable`);
      } catch (error) {
        console.error('Error loading events from environment variable:', error);
      }
    }
    
    if (fs.existsSync(LOCATIONS_FILE)) {
      global.locations = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf8'));
      console.log(`Loaded ${global.locations.length} locations from file`);
    } else {
      initializeLocations();
      saveData('locations');
    }
    
    if (fs.existsSync(QUESTIONS_FILE)) {
      global.questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
      console.log(`Loaded ${global.questions.length} questions from file`);
    }
    
    if (fs.existsSync(FEEDBACK_FILE)) {
      global.feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
      console.log(`Loaded ${global.feedback.length} feedback items from file`);
    }
    
    console.log('Data loading complete');
  } catch (error) {
    console.error('Error loading data from files:', error);
  }
}

// Save data to files
function saveData(dataType) {
  console.log(`Attempting to save ${dataType} data to file`);
  try {
    switch (dataType) {
      case 'users':
        fs.writeFileSync(USERS_FILE, JSON.stringify(global.users, null, 2));
        console.log(`Successfully saved ${global.users.length} users to file`);
        break;
      case 'events':
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(global.events, null, 2));
        console.log(`Successfully saved ${global.events.length} events to file`);
        try {
          process.env[EVENTS_ENV_VAR] = JSON.stringify(global.events);
          console.log('Saved events to environment variable as backup');
        } catch (error) {
          console.error('Error saving events to environment variable:', error);
        }
        break;
      case 'locations':
        fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(global.locations, null, 2));
        console.log(`Successfully saved ${global.locations.length} locations to file`);
        break;
      case 'questions':
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(global.questions, null, 2));
        console.log(`Successfully saved ${global.questions.length} questions to file`);
        break;
      case 'feedback':
        fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(global.feedback, null, 2));
        console.log(`Successfully saved ${global.feedback.length} feedback items to file`);
        break;
      default:
        console.warn(`Unknown data type: ${dataType}`);
    }
  } catch (error) {
    console.error(`Error saving ${dataType} data to file:`, error);
    if (dataType === 'events') {
      try {
        process.env[EVENTS_ENV_VAR] = JSON.stringify(global.events);
        console.log('Saved events to environment variable after file save failed');
      } catch (backupError) {
        console.error('Error saving events to environment variable:', backupError);
      }
    }
  }
}

// Initialize locations
function initializeLocations() {
  global.locations = [
    { id: 'faszqdvgci4i1gt143dwbc', name: 'Üsküdar' },
    { id: 'faszqdvgci4i1gt143dwbd', name: 'Bahçeşehir' },
    { id: 'faszqdvgci4i1gt143dwbe', name: 'Bostancı' },
    { id: 'faszqdvgci4i1gt143dwbf', name: 'Kadıköy' },
    { id: 'faszqdvgci4i1gt143dwbg', name: 'Beşiktaş' },
    { id: 'faszqdvgci4i1gt143dwbh', name: 'Mecidiyeköy' }
  ];
  console.log('Initialized 6 locations');
}

// Load data at startup
loadData();

// Models
class User {
  constructor(name, email, password) {
    this.id = uuidv4();
    this.name = name;
    this.email = email;
    this.password = password;
    this.createdAt = new Date().toISOString();
  }
}

class Event {
  constructor(name, userId, date, capacity, description = '', locationId = null) {
    this.id = uuidv4();
    this.name = name;
    this.userId = userId;
    this.date = date || new Date().toISOString();
    this.capacity = capacity || 20;
    this.description = description;
    this.locationId = locationId;
    this.createdAt = new Date().toISOString();
  }
}

class Question {
  constructor(text, eventId, category, deckPhase) {
    this.id = uuidv4();
    this.text = text;
    this.eventId = eventId;
    this.category = category;
    this.deckPhase = deckPhase;
    this.createdAt = new Date().toISOString();
  }
}

class Feedback {
  constructor(questionId, eventId, locationId, feedbackType, userId) {
    this.id = uuidv4();
    this.questionId = questionId;
    this.eventId = eventId;
    this.locationId = locationId;
    this.feedbackType = feedbackType;
    this.userId = userId;
    this.createdAt = new Date().toISOString();
  }
}

// Middleware for token authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'EnTalk Questions Tool API',
    version: '1.0.0',
    dataDirectory: DATA_DIR,
    eventsCount: global.events.length
  });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    const existingUser = global.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User(name, email, hashedPassword);
    global.users.push(newUser);
    saveData('users');
    
    const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({
      message: 'User registered successfully',
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = global.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      message: 'Login successful',
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create event
app.post('/api/events', authenticateToken, (req, res) => {
  try {
    console.log('Creating event with data:', req.body);
    const { name, date, capacity, description, locationId } = req.body;
    const userId = req.user.id;
    
    if (!name) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    
    const newEvent = new Event(name, userId, date, capacity, description, locationId);
    global.events.push(newEvent);
    console.log(`Event created with ID: ${newEvent.id}`);
    saveData('events');
    
    console.log(`Current events (${global.events.length}):`, global.events.map(e => ({ id: e.id, name: e.name, userId: e.userId })));
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
    console.log(`Getting events for user: ${userId}`);
    console.log(`Total events in system: ${global.events.length}`);
    
    const userEvents = global.events.filter(e => e.userId === userId);
    console.log(`Found ${userEvents.length} events for user ${userId}`);
    res.json(userEvents);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
});

// Get all locations
app.get('/api/locations', (req, res) => {
  try {
    res.json(global.locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to retrieve locations' });
  }
});

// Get question categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = [
      "Ice Breakers",
      "Personal Growth",
      "Cultural Exchange",
      "Language Learning",
      "Professional Development",
      "Hobbies & Interests",
      "Travel & Adventure",
      "Food & Cuisine",
      "Arts & Entertainment",
      "Technology & Innovation"
    ];
    
    const categoriesWithDescriptions = categories.map(category => ({
      name: category,
      description: `Questions related to ${category.toLowerCase()}`
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
    const phases = [
      "Introduction",
      "Warm-up",
      "Deep Dive",
      "Reflection",
      "Conclusion"
    ];
    
    const phasesWithDescriptions = phases.map(phase => ({
      name: phase,
      description: `Questions for the ${phase.toLowerCase()} phase of conversation`
    }));
    
    res.json(phasesWithDescriptions);
  } catch (error) {
    console.error('Get phases error:', error);
    res.status(500).json({ error: 'Failed to retrieve phases' });
  }
});

// Generate questions
app.post('/api/questions', authenticateToken, async (req, res) => {
  try {
    const { eventId, topic, count, category, deckPhase } = req.body;
    
    if (!eventId || !topic || !category || !deckPhase) {
      return res.status(400).json({ error: 'Event ID, topic, category, and deck phase are required' });
    }
    
    // Validate event exists and belongs to user
    const event = global.events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to access this event' });
    }
    
    // Generate mock questions (replace with actual AI generation in production)
    const mockQuestions = [];
    for (let i = 0; i < (count || 5); i++) {
      mockQuestions.push({
        text: `What do you think about ${topic} in relation to everyday life? (Question ${i+1})`,
        category,
        deckPhase
      });
    }
    
    // Save questions
    const savedQuestions = mockQuestions.map(q => {
      const question = new Question(q.text, eventId, q.category, q.deckPhase);
      global.questions.push(question);
      return question;
    });
    
    saveData('questions');
    res.json({ message: 'Questions generated successfully', questions: savedQuestions });
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// NEW: Generate question deck endpoint
app.post('/api/decks/generate/:locationId', authenticateToken, (req, res) => {
  try {
    const { eventId } = req.body;
    const { locationId } = req.params;
    
    if (!eventId || !locationId) {
      return res.status(400).json({ error: 'Event ID and location ID are required' });
    }
    
    // Validate event exists and belongs to user
    const event = global.events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to access this event' });
    }
    
    // Generate a mock deck:
    const deck = {
      accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(), // random 6-character code
      questions: global.questions.filter(q => q.eventId === eventId),
      date: new Date().toISOString()
    };
    
    // Store the deck in global.decks for participant retrieval
    global.decks.push(deck);
    
    res.json(deck);
  } catch (error) {
    console.error('Generate deck error:', error);
    res.status(500).json({ error: 'Failed to generate deck' });
  }
});

// NEW: Get deck by access code for participant view
app.get('/api/decks/:accessCode', (req, res) => {
  try {
    const { accessCode } = req.params;
    const deck = global.decks.find(d => d.accessCode === accessCode);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    res.json(deck);
  } catch (error) {
    console.error('Get deck error:', error);
    res.status(500).json({ error: 'Failed to retrieve deck' });
  }
});

// Record question feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { questionId, eventId, locationId, feedbackType, userId } = req.body;
    
    if (!questionId || !eventId || !locationId || !feedbackType) {
      return res.status(400).json({ error: 'Question ID, event ID, location ID, and feedback type are required' });
    }
    
    const newFeedback = new Feedback(questionId, eventId, locationId, feedbackType, userId);
    global.feedback.push(newFeedback);
    saveData('feedback');
    
    res.status(201).json({ message: 'Feedback recorded successfully', feedback: newFeedback });
  } catch (error) {
    console.error('Record feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get feedback for event
app.get('/api/feedback/:eventId', authenticateToken, (req, res) => {
  try {
    const { eventId } = req.params;
    const event = global.events.find(e => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to access this event' });
    }
    
    const eventFeedback = global.feedback.filter(f => f.eventId === eventId);
    const eventQuestions = global.questions.filter(q => q.eventId === eventId);
    
    const feedbackStats = eventQuestions.map(question => {
      const questionFeedback = eventFeedback.filter(f => f.questionId === question.id);
      const positiveCount = questionFeedback.filter(f => f.feedbackType === 'positive').length;
      const negativeCount = questionFeedback.filter(f => f.feedbackType === 'negative').length;
      const totalCount = questionFeedback.length;
      
      return {
        question: question.text,
        category: question.category,
        deckPhase: question.deckPhase,
        positiveCount,
        negativeCount,
        totalCount,
        positivePercentage: totalCount > 0 ? (positiveCount / totalCount) * 100 : 0
      };
    });
    
    res.json(feedbackStats);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});

// Debug endpoint to check data storage
app.get('/api/debug/storage', (req, res) => {
  try {
    const storageInfo = {
      dataDirectory: DATA_DIR,
      filesExist: {
        users: fs.existsSync(USERS_FILE),
        events: fs.existsSync(EVENTS_FILE),
        locations: fs.existsSync(LOCATIONS_FILE),
        questions: fs.existsSync(QUESTIONS_FILE),
        feedback: fs.existsSync(FEEDBACK_FILE)
      },
      counts: {
        users: global.users.length,
        events: global.events.length,
        locations: global.locations.length,
        questions: global.questions.length,
        feedback: global.feedback.length
      },
      environmentVariables: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        eventsInEnvVar: !!process.env[EVENTS_ENV_VAR]
      }
    };
    res.json(storageInfo);
  } catch (error) {
    console.error('Debug storage error:', error);
    res.status(500).json({ error: 'Failed to retrieve storage information' });
  }
});

// Debug endpoint to create a test user (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/debug/create-test-user', async (req, res) => {
    try {
      const name = 'Test User';
      const email = 'test@example.com';
      const password = 'test123';
      const existingUser = global.users.find(u => u.email === email);
      if (existingUser) {
        return res.json({ message: 'Test user already exists', user: { id: existingUser.id, name: existingUser.name, email: existingUser.email } });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User(name, email, hashedPassword);
      global.users.push(newUser);
      saveData('users');
      
      const eventName = 'Test Event';
      const eventDate = new Date().toISOString();
      const eventCapacity = 20;
      const newEvent = new Event(eventName, newUser.id, eventDate, eventCapacity);
      global.events.push(newEvent);
      saveData('events');
      
      res.status(201).json({ message: 'Test user and event created successfully', user: { id: newUser.id, name: newUser.name, email: newUser.email, password: 'test123' }, event: newEvent });
    } catch (error) {
      console.error('Create test user error:', error);
      res.status(500).json({ error: 'Failed to create test user' });
    }
  });
}

// Serve frontend for all other routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Events count: ${global.events.length}`);
});
