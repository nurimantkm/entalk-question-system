// questionService.js - Fixed version with circular dependency resolved

const { Question, Feedback, Deck } = require('./models'); // Import models
const openai = require('openai');

// Helper function to generate a random access code
function generateAccessCode() {
  return Math.random().toString(36).substring(2, 10);
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

// ... (keep other helper functions like getCategoryDescription, getPhaseDescription) ...

// Create multiple questions with categories and phases
async function createQuestions(questions, eventId) {
  try {
    const createdQuestions = await Question.insertMany(
      questions.map(q => ({
        text: q.text,
        eventId,
        category: q.category,
        deckPhase: q.deckPhase,
        isNovelty: q.isNovelty || false
      }))
    );
    return createdQuestions;
  } catch (error) {
    console.error('Error creating questions:', error);
    throw error;
  }
}

// Record feedback for a question
async function recordFeedback(questionId, eventId, locationId, feedbackType, userId = null) {
  try {
    // Create feedback record
    const feedback = new Feedback({
      questionId,
      eventId,
      locationId,
      feedbackType,
      userId
    });
    await feedback.save();

    // Update question performance
    const question = await Question.findOne({ id: questionId });
    if (question) {
      if (feedbackType === 'like') {
        question.performance.likes++;
      } else if (feedbackType === 'dislike') {
        question.performance.dislikes++;
      }
      // Update score (you might need a more sophisticated scoring logic)
      question.performance.score = question.performance.likes - question.performance.dislikes;
      await question.save();
    }

    return feedback;
  } catch (error) {
    console.error('Error recording feedback:', error);
    throw error;
  }
}

// Get feedback statistics for a question
async function getFeedbackStats(questionId) {
  try {
    const question = await Question.findOne({ id: questionId });
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
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    throw error;
  }
}

// Get questions that haven't been used at a location recently
async function getAvailableQuestionsForLocation(locationId, days = 28) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await Question.find({
      $or: [
        { lastUsed: { $not: { $elemMatch: { locationId } } } },
        { 'lastUsed': { $elemMatch: { locationId, date: { $lt: cutoffDate } } } }
      ]
    });
  } catch (error) {
    console.error('Error getting available questions:', error);
    throw error;
  }
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
      // Sort by score within the category and pick the best one
      categoryQuestions.sort((a, b) => b.performance.score - a.performance.score);
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
      // Sort by score within the phase and pick the best one
      phaseQuestions.sort((a, b) => b.performance.score - a.performance.score);
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

// Generate questions using OpenAI (mock for now)
async function generateAIQuestions(categories, phases, count = 5) {
  // For now, return mock questions
  // In production, this would call the OpenAI API
  const mockQuestions = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const phase = phases[i % phases.length];

    mockQuestions.push({
      text: `AI generated ${category} question for ${phase} phase #${i + 1}`,
      category,
      deckPhase: phase,
      isNovelty: true
    });
  }

  return mockQuestions;
}

// Generate a deck of questions for a location
async function generateQuestionDeck(locationId, eventId) {
  try {
    // 1. Get available questions for this location
    let availableQuestions = await getAvailableQuestionsForLocation(locationId);

    // 2. Calculate scores for all questions (if needed, can be done periodically)
    //    For now, we assume scores are up-to-date

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

      // Create and save the AI questions
      const createdAiQuestions = await createQuestions(aiQuestions, eventId);
      selectedQuestions = [...selectedQuestions, ...createdAiQuestions];

      // Refresh available questions to include newly created ones
      availableQuestions = await getAvailableQuestionsForLocation(locationId);
      selectedQuestions = selectedQuestions.map(q =>
        availableQuestions.find(aq => aq.id === q.id)
      );
    }

    // 7. Record usage for all selected questions
    for (const question of selectedQuestions) {
      // Use updateOne to avoid race conditions
      await Question.updateOne(
        { id: question.id },
        { $push: { lastUsed: { locationId, date: new Date() } } }
      );
    }

    // 8. Create and save the deck
    const accessCode = generateAccessCode();
    const newDeck = new Deck({
      accessCode,
      eventId,
      questions: selectedQuestions.map(q => q.id), // Store question IDs
      date: new Date()
    });
    await newDeck.save();

    // 9. Populate questions for the response (optional, for debugging)
    const populatedDeck = await Deck.findOne({ accessCode }).populate('questions');

    return populatedDeck; // Return the Mongoose Deck object
  } catch (error) {
    console.error('Error generating deck:', error);
    throw error;
  }
}

// Get a deck by access code
async function getDeckByAccessCode(accessCode) {
  try {
    const deck = await Deck.findOne({ accessCode }).populate('questions');
    if (!deck) {
      throw new Error('Deck not found');
    }
    return deck;
  } catch (error) {
    console.error('Error getting deck by access code:', error);
    throw error;
  }
}

// ... (You may not need getActiveDeckForLocation in this version) ...

module.exports = {
  getQuestionCategories,
  getDeckPhases,
  // ... other helper functions ...
  createQuestions,
  recordFeedback,
  getFeedbackStats,
  getAvailableQuestionsForLocation,
  generateQuestionDeck,
  getDeckByAccessCode,
  // ... (remove getActiveDeckForLocation if not needed) ...
};
