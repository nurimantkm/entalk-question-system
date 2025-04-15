// server.mongodb.js – A revised server file using MongoDB via Mongoose
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateNoveltyQuestions } = require('./openaiService');


const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
const MONGO_URI = process.env.MONGO_URI || 'your_mongo_connection_string_here';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''; // if provided, used in your OpenAI module

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define Mongoose Schemas and Models

const userSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const eventSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  name: String,
  userId: String,
  date: { type: Date, default: Date.now },
  capacity: { type: Number, default: 20 },
  description: String,
  locationId: String,
  createdAt: { type: Date, default: Date.now }
});
const Event = mongoose.model('Event', eventSchema);

const questionSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  text: String,
  eventId: String,
  category: String,
  deckPhase: String,
  createdAt: { type: Date, default: Date.now }
});
const Question = mongoose.model('Question', questionSchema);

const feedbackSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  questionId: String,
  eventId: String,
  locationId: String,
  feedbackType: String,
  userId: String,
  createdAt: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

const locationSchema = new mongoose.Schema({
  id: String,
  name: String
});
const Location = mongoose.model('Location', locationSchema);

const deckSchema = new mongoose.Schema({
  accessCode: String,
  eventId: String,
  questions: [questionSchema],
  date: { type: Date, default: Date.now }
});
const Deck = mongoose.model('Deck', deckSchema);

// Initialize Express app
const app = express();
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
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    
    const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth', async (req, res) => {
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

// Create event
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    console.log('Creating event with data:', req.body);
    const { name, date, capacity, description, locationId } = req.body;
    const userId = req.user.id;
    if (!name) return res.status(400).json({ error: 'Event name is required' });
    
    const newEvent = new Event({ name, userId, date, capacity, description, locationId });
    await newEvent.save();
    console.log(`Event created with ID: ${newEvent.id}`);
    res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Event creation failed' });
  }
});

// Get user's events
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Getting events for user: ${userId}`);
    const userEvents = await Event.find({ userId });
    console.log(`Found ${userEvents.length} events for user ${userId}`);
    res.json(userEvents);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
});

// Get all locations (initialize defaults if needed)
app.get('/api/locations', async (req, res) => {
  try {
    let locations = await Location.find();
    if (!locations || locations.length === 0) {
      // Initialize default locations
      locations = [
        { id: 'faszqdvgci4i1gt143dwbc', name: 'Üsküdar' },
        { id: 'faszqdvgci4i1gt143dwbd', name: 'Bahçeşehir' },
        { id: 'faszqdvgci4i1gt143dwbe', name: 'Bostancı' },
        { id: 'faszqdvgci4i1gt143dwbf', name: 'Kadıköy' },
        { id: 'faszqdvgci4i1gt143dwbg', name: 'Beşiktaş' },
        { id: 'faszqdvgci4i1gt143dwbh', name: 'Mecidiyeköy' }
      ];
      await Location.insertMany(locations);
    }
    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to retrieve locations' });
  }
});

// Get question categories (mocked)
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

// Get deck phases (mocked)
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
    const event = await Event.findOne({ id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized for this event' });
    
    // Generate mock questions (replace this with actual OpenAI generation logic)
    const mockQuestions = [];
    const num = count || 5;
    for (let i = 0; i < num; i++) {
      mockQuestions.push({
        text: `What do you think about ${topic} in relation to everyday life? (Question ${i+1})`,
        category,
        deckPhase
      });
    }
    
    // Save questions to database
    const savedQuestions = await Promise.all(
      mockQuestions.map(async q => {
        const question = new Question({ text: q.text, eventId, category: q.category, deckPhase: q.deckPhase });
        return await question.save();
      })
    );
    
    res.json({ message: 'Questions generated successfully', questions: savedQuestions });
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Generate question deck endpoint
app.post('/api/decks/generate/:locationId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.body;
    const { locationId } = req.params;
    if (!eventId || !locationId) {
      return res.status(400).json({ error: 'Event ID and location ID are required' });
    }
    
    const event = await Event.findOne({ id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized for this event' });
    
    // Retrieve questions for the event
    const questions = await Question.find({ eventId });
    
    // Generate a mock deck
    const deck = new Deck({
      accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      eventId,
      questions,
      date: new Date().toISOString()
    });
    await deck.save();
    
    res.json(deck);
  } catch (error) {
    console.error('Generate deck error:', error);
    res.status(500).json({ error: 'Failed to generate deck' });
  }
});

// Get deck by access code (for participant view)
app.get('/api/decks/:accessCode', async (req, res) => {
  try {
    const { accessCode } = req.params;
    const deck = await Deck.findOne({ accessCode });
    if (!deck) return res.status(404).json({ error: 'Deck not found' });
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
    await newFeedback.save();
    
    res.status(201).json({ message: 'Feedback recorded successfully', feedback: newFeedback });
  } catch (error) {
    console.error('Record feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get feedback for event
app.get('/api/feedback/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized for this event' });
    
    const eventFeedback = await Feedback.find({ eventId });
    const eventQuestions = await Question.find({ eventId });
    
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
app.get('/api/debug/storage', async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const eventsCount = await Event.countDocuments();
    const locationsCount = await Location.countDocuments();
    const questionsCount = await Question.countDocuments();
    const feedbackCount = await Feedback.countDocuments();
    const decksCount = await Deck.countDocuments();
    
    res.json({
      data: {
        users: usersCount,
        events: eventsCount,
        locations: locationsCount,
        questions: questionsCount,
        feedback: feedbackCount,
        decks: decksCount
      },
      environmentVariables: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT
      }
    });
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
      
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.json({ message: 'Test user already exists', user: existingUser });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ name, email, password: hashedPassword });
      await newUser.save();
      
      const eventName = 'Test Event';
      const eventDate = new Date().toISOString();
      const eventCapacity = 20;
      const newEvent = new Event(eventName, newUser.id, eventDate, eventCapacity);
      await newEvent.save();
      
      res.status(201).json({ message: 'Test user and event created successfully', user: newUser, event: newEvent });
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
});
