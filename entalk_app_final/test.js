// test.js - Test script for Entalk Question System

// Import required modules
const assert = require('assert');
const { User, Event, Question, Feedback, Location, QuestionDeck } = require('./models');
const questionService = require('./questionService');

// Test data
const testUser = new User('Test User', 'test@example.com', 'password123');
const testEvent = new Event('Test Event', 'Test Description', new Date().toISOString(), testUser.id);
const testLocation = new Location('Test Location', 1);

// Initialize global arrays for testing
global.users = [testUser];
global.events = [testEvent];
global.questions = [];
global.feedback = [];
global.locations = [testLocation];
global.questionDecks = [];

// Test functions
async function runTests() {
  console.log('Starting Entalk Question System tests...');
  
  try {
    // Test question creation
    await testQuestionCreation();
    
    // Test feedback recording
    await testFeedbackRecording();
    
    // Test question scoring
    await testQuestionScoring();
    
    // Test deck generation
    await testDeckGeneration();
    
    // Test question selection algorithm
    await testQuestionSelection();
    
    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test question creation
async function testQuestionCreation() {
  console.log('Testing question creation...');
  
  const questionData = [
    {
      text: 'What is your favorite hobby?',
      category: 'Personal',
      deckPhase: 'Warm-Up'
    },
    {
      text: 'If you could travel anywhere, where would you go?',
      category: 'Hypothetical',
      deckPhase: 'Personal'
    }
  ];
  
  const createdQuestions = questionService.createQuestions(questionData, testEvent.id);
  
  assert.strictEqual(createdQuestions.length, 2, 'Should create 2 questions');
  assert.strictEqual(global.questions.length, 2, 'Should add questions to global array');
  assert.strictEqual(createdQuestions[0].category, 'Personal', 'Should set correct category');
  assert.strictEqual(createdQuestions[1].deckPhase, 'Personal', 'Should set correct deck phase');
  
  console.log('Question creation test passed!');
  return createdQuestions;
}

// Test feedback recording
async function testFeedbackRecording() {
  console.log('Testing feedback recording...');
  
  // Create a test question if none exists
  if (global.questions.length === 0) {
    await testQuestionCreation();
  }
  
  const question = global.questions[0];
  
  // Record like feedback
  const likeFeedback = questionService.recordFeedback(
    question.id,
    testEvent.id,
    testLocation.id,
    'like'
  );
  
  assert.strictEqual(global.feedback.length, 1, 'Should add feedback to global array');
  assert.strictEqual(likeFeedback.feedback, 'like', 'Should record like feedback');
  assert.strictEqual(question.performance.likes, 1, 'Should increment likes count');
  assert.strictEqual(question.performance.views, 1, 'Should increment views count');
  
  // Record dislike feedback
  const dislikeFeedback = questionService.recordFeedback(
    question.id,
    testEvent.id,
    testLocation.id,
    'dislike'
  );
  
  assert.strictEqual(global.feedback.length, 2, 'Should add second feedback to global array');
  assert.strictEqual(dislikeFeedback.feedback, 'dislike', 'Should record dislike feedback');
  assert.strictEqual(question.performance.dislikes, 1, 'Should increment dislikes count');
  assert.strictEqual(question.performance.views, 2, 'Should increment views count again');
  
  console.log('Feedback recording test passed!');
}

// Test question scoring
async function testQuestionScoring() {
  console.log('Testing question scoring...');
  
  // Create a test question if none exists
  if (global.questions.length === 0) {
    await testQuestionCreation();
  }
  
  const question = global.questions[0];
  
  // Record multiple feedbacks to test scoring
  for (let i = 0; i < 8; i++) {
    questionService.recordFeedback(
      question.id,
      testEvent.id,
      testLocation.id,
      i < 6 ? 'like' : 'dislike' // 6 likes, 2 dislikes
    );
  }
  
  // Calculate score
  const score = question.calculateScore();
  
  // Check that score is calculated correctly
  // Like rate should be 7/10 = 0.7 (including previous test feedbacks)
  const likeRate = question.performance.likes / question.performance.views;
  assert.strictEqual(likeRate, 7/10, 'Like rate should be 7/10');
  
  // Score should be between 0 and 1
  assert(score >= 0 && score <= 1, 'Score should be between 0 and 1');
  
  console.log('Question scoring test passed!');
}

// Test deck generation
async function testDeckGeneration() {
  console.log('Testing deck generation...');
  
  // Create more test questions with different categories
  const categories = questionService.getQuestionCategories();
  const phases = questionService.getDeckPhases();
  
  // Create 20 questions with different categories and phases
  const questionData = [];
  for (let i = 0; i < 20; i++) {
    questionData.push({
      text: `Test question ${i+1}`,
      category: categories[i % categories.length],
      deckPhase: phases[i % phases.length],
      isNovelty: i >= 15 // Make some novelty questions
    });
  }
  
  questionService.createQuestions(questionData, testEvent.id);
  
  // Generate a deck
  const deck = await questionService.generateQuestionDeck(testLocation.id, testEvent.id);
  
  assert(deck, 'Should generate a deck');
  assert.strictEqual(deck.eventId, testEvent.id, 'Deck should be associated with the event');
  assert.strictEqual(deck.locationId, testLocation.id, 'Deck should be associated with the location');
  assert(deck.questions.length <= 15, 'Deck should have at most 15 questions');
  assert(deck.accessCode, 'Deck should have an access code');
  
  // Check that the deck contains questions from different categories
  const deckQuestions = deck.questions.map(qId => 
    global.questions.find(q => q.id === qId)
  );
  
  const deckCategories = new Set(deckQuestions.map(q => q.category));
  assert(deckCategories.size > 1, 'Deck should contain questions from multiple categories');
  
  console.log('Deck generation test passed!');
  return deck;
}

// Test question selection algorithm
async function testQuestionSelection() {
  console.log('Testing question selection algorithm...');
  
  // Create a deck if none exists
  let deck;
  if (global.questionDecks.length === 0) {
    deck = await testDeckGeneration();
  } else {
    deck = global.questionDecks[0];
  }
  
  // Test that questions are marked as used
  const deckQuestions = deck.questions.map(qId => 
    global.questions.find(q => q.id === qId)
  );
  
  deckQuestions.forEach(question => {
    assert(question.usageHistory.some(usage => usage.locationId === testLocation.id),
      'Question should be marked as used at the location');
  });
  
  // Test that recently used questions are filtered out
  const availableQuestions = questionService.getAvailableQuestionsForLocation(testLocation.id);
  
  deckQuestions.forEach(question => {
    assert(!availableQuestions.includes(question),
      'Recently used questions should be filtered out');
  });
  
  console.log('Question selection algorithm test passed!');
}

// Run the tests
runTests();
