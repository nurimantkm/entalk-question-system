// questionService.js - Fixed version with circular dependency resolved
const { Question, Feedback } = require('./models');
const openai = require('openai');
const { v4: uuidv4 } = require('uuid');

// Initialize global arrays if they don't exist
if (!global.questions) global.questions = [];
if (!global.feedback) global.feedback = [];
 
// REMOVED: initializeLocations function is now in server.js
// This resolves the circular dependency issue

// Get all locations
function getLocations() {
  return global.locations || [];
}

// Get all question categories
function getQuestionCategories() {
  return [
    'Icebreaker',
    'Personal',
    'Opinion',
    'Hypothetical',
    'Reflective',
    'Cultural'
  ];
}

// Get all deck phases
function getDeckPhases() {
  return [
    'Warm-Up',
    'Personal',
    'Reflective',
    'Challenge'
  ];
}

// Get category description
function getCategoryDescription(category) {
  const descriptions = {
    'Icebreaker': 'Simple questions to start conversations and make people comfortable',
    'Personal': 'Questions about personal experiences, preferences, and life',
    'Opinion': 'Questions asking for thoughts on various topics or issues',
    'Hypothetical': 'What-if scenarios that encourage creative thinking',
    'Reflective': 'Questions that encourage deeper thinking about oneself',
    'Cultural': 'Questions about traditions, customs, and cultural experiences'
  };
  return descriptions[category] || '';
}

// Get phase description
function getPhaseDescription(phase) {
  const descriptions = {
    'Warm-Up': 'Easy questions to start the conversation',
    'Personal': 'Questions about personal experiences and preferences',
    'Reflective': 'Questions that encourage deeper thinking',
    'Challenge': 'More complex or thought-provoking questions'
  };
  return descriptions[phase] || '';
}

// Create multiple questions with categories and phases
function createQuestions(questions, eventId) {
  const createdQuestions = [];
  
  questions.forEach(q => {
    const question = new Question(
      q.text,
      eventId,
      q.category,
      q.deckPhase,
      q.isNovelty || false
    );
    global.questions.push(question);
    createdQuestions.push(question);
  });
  
  return createdQuestions;
}

// Record feedback for a question
function recordFeedback(questionId, eventId, locationId, feedbackType, userId = null) {
  // Find the question
  const question = global.questions.find(q => q.id === questionId);
  if (!question) {
    throw new Error('Question not found');
  }
  
  // Create feedback record
  const feedback = new Feedback(
    questionId,
    eventId,
    locationId,
    feedbackType,
    userId
  );
  
  // Update question performance
  question.updatePerformance(feedbackType);
  
  // Save feedback
  global.feedback.push(feedback);
  
  return feedback;
}

// Get feedback statistics for a question
function getFeedbackStats(questionId) {
  const question = global.questions.find(q => q.id === questionId);
  if (!question) {
    throw new Error('Question not found');
  }
  
  return {
    questionId,
    views: question.performance.views,
    likes: question.performance.likes,
    dislikes: question.performance.dislikes,
    likeRate: question.performance.views > 0 ? 
      (question.performance.likes / question.performance.views) : 0,
    score: question.performance.score
  };
}

// Get questions that haven't been used at a location recently
function getAvailableQuestionsForLocation(locationId, days = 28) {
  return global.questions.filter(question => !question.wasUsedRecently(locationId, days));
}

// Select questions with balanced category coverage
function selectWithCoverage(questions, count = 12) {
  const categories = getQuestionCategories();
  const phases = getDeckPhases();
  const selected = [];
  
  // Ensure at least one question from each category
  categories.forEach(category => {
    const categoryQuestions = questions.filter(q => q.category === category);
    if (categoryQuestions.length > 0) {
      selected.push(categoryQuestions[0]);
      // Remove from original array to avoid duplicates
      const index = questions.findIndex(q => q.id === categoryQuestions[0].id);
      if (index !== -1) questions.splice(index, 1);
    }
  });
  
  // Ensure at least one question from each phase
  phases.forEach(phase => {
    const phaseQuestions = questions.filter(q => q.deckPhase === phase);
    if (phaseQuestions.length > 0) {
      selected.push(phaseQuestions[0]);
      // Remove from original array to avoid duplicates
      const index = questions.findIndex(q => q.id === phaseQuestions[0].id);
      if (index !== -1) questions.splice(index, 1);
    }
  });
  
  // Fill remaining slots with highest scored questions
  const remaining = count - selected.length;
  if (remaining > 0 && questions.length > 0) {
    // Sort by score
    questions.sort((a, b) => b.performance.score - a.performance.score);
    selected.push(...questions.slice(0, remaining));
  }
  
  return selected;
}

// Select novelty questions (creative or unusual)
function selectNoveltyQuestions(questions, count = 3) {
  // First try to find questions marked as novelty
  let noveltyQuestions = questions.filter(q => q.isNovelty);
  
  // If not enough, select questions with lowest view counts (newer questions)
  if (noveltyQuestions.length < count) {
    const regularQuestions = questions
      .filter(q => !q.isNovelty)
      .sort((a, b) => a.performance.views - b.performance.views);
    
    noveltyQuestions = [
      ...noveltyQuestions,
      ...regularQuestions.slice(0, count - noveltyQuestions.length)
    ];
  }
  
  return noveltyQuestions.slice(0, count);
}

// Find missing categories in a set of questions
function findMissingCategories(selectedQuestions) {
  const categories = getQuestionCategories();
  const selectedCategories = selectedQuestions.map(q => q.category);
  
  return categories.filter(category => !selectedCategories.includes(category));
}

// Generate questions using OpenAI
async function generateAIQuestions(categories, phases, count = 5) {
  // For now, return mock questions
  // In production, this would call the OpenAI API
  const mockQuestions = [];
  
  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const phase = phases[i % phases.length];
    
    mockQuestions.push({
      text: `AI generated ${category} question for ${phase} phase #${i+1}`,
      category,
      deckPhase: phase,
      isNovelty: true
    });
  }
  
  return mockQuestions;
}

// Generate a deck of questions for a location
async function generateQuestionDeck(locationId, eventId) {
  // 1. Get available questions for this location **and** event
  let availableQuestions = getAvailableQuestionsForLocation(locationId);
  availableQuestions = availableQuestions.filter(q => q.eventId === eventId);

  // 2. Calculate scores for all questions
  availableQuestions.forEach(q => q.calculateScore());
  
  // 3. Select main questions with category coverage
  const mainQuestions = selectWithCoverage(
    [...availableQuestions], // Create a copy to avoid modifying original
    12
  );
  
  // 4. Select novelty questions
  const noveltyQuestions = selectNoveltyQuestions(
    availableQuestions.filter(q => !mainQuestions.includes(q)),
    3
  );
  
  // 5. Combine and check if we have enough
  let selectedQuestions = [...mainQuestions, ...noveltyQuestions];
  
  // 6. If not enough questions, generate with AI
  if (selectedQuestions.length < 15) {
    const missingCount = 15 - selectedQuestions.length;
    const missingCategories = findMissingCategories(selectedQuestions);
    const missingPhases = getDeckPhases().filter(phase => 
      !selectedQuestions.some(q => q.deckPhase === phase)
    );
    
    const aiQuestions = await generateAIQuestions(
      missingCategories.length > 0 ? missingCategories : getQuestionCategories(),
      missingPhases.length > 0 ? missingPhases : getDeckPhases(),
      missingCount
    );
    
    // Create the AI questions
    const createdAiQuestions = createQuestions(aiQuestions, eventId);
    selectedQuestions = [...selectedQuestions, ...createdAiQuestions];
  }
  
  // 7. Record usage for all selected questions and get the complete question objects
  const questionsForDeck = selectedQuestions.map(q => {
    q.recordUsage(locationId);
    return q;
  });

  // 8. Return the deck
  return {
    accessCode: uuidv4(),
    eventId,
    locationId,
    questions: questionsForDeck
  };
}

// Export the functions directly
module.exports = {
  getLocations,
  getQuestionCategories,
  getDeckPhases,
  getCategoryDescription,
  getPhaseDescription,
  createQuestions,
  recordFeedback,
  getFeedbackStats,
  getAvailableQuestionsForLocation,  
  generateQuestionDeck
};
