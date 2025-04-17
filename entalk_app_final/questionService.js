// questionService.js - Fixed version with id-based errors resolved

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
    const feedback = new Feedback({
      questionId,
      eventId,
      locationId,
      feedbackType,
      userId
    });
    await feedback.save();

    const question = await Question.findOne({ id: questionId });
    if (question) {
      if (feedbackType === 'like') {
        question.performance.likes++;
      } else if (feedbackType === 'dislike') {
        question.performance.dislikes++;
      }
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
        { lastUsed: { $elemMatch: { locationId, date: { $lt: cutoffDate } } } }
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

  categories.forEach(category => {
    const categoryQuestions = questions.filter(q => q.category === category);
    if (categoryQuestions.length > 0) {
      categoryQuestions.sort((a, b) => b.performance.score - a.performance.score);
      selected.push(categoryQuestions[0]);
      const index = questions.findIndex(q => q.id === categoryQuestions[0].id);
      if (index !== -1) questions.splice(index, 1);
    }
  });

  phases.forEach(phase => {
    const phaseQuestions = questions.filter(q => q.deckPhase === phase);
    if (phaseQuestions.length > 0) {
      phaseQuestions.sort((a, b) => b.performance.score - a.performance.score);
      selected.push(phaseQuestions[0]);
      const index = questions.findIndex(q => q.id === phaseQuestions[0].id);
      if (index !== -1) questions.splice(index, 1);
    }
  });

  const remaining = count - selected.length;
  if (remaining > 0 && questions.length > 0) {
    questions.sort((a, b) => b.performance.score - a.performance.score);
    selected.push(...questions.slice(0, remaining));
  }

  return selected;
}

// Select novelty questions (creative or unusual)
function selectNoveltyQuestions(questions, count = 3) {
  let noveltyQuestions = questions.filter(q => q.isNovelty);

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
    let availableQuestions = await getAvailableQuestionsForLocation(locationId);

    const mainQuestions = selectWithCoverage([...availableQuestions], 12);

    const noveltyQuestions = selectNoveltyQuestions(
      availableQuestions.filter(q => !mainQuestions.includes(q)), 3
    );

    let selectedQuestions = [...mainQuestions, ...noveltyQuestions];

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

      const createdAiQuestions = await createQuestions(aiQuestions, eventId);
      selectedQuestions = [...selectedQuestions, ...createdAiQuestions];

      availableQuestions = await getAvailableQuestionsForLocation(locationId);
      selectedQuestions = selectedQuestions.map(q =>
        availableQuestions.find(aq => aq.id === q.id)
      );
    }

    for (const question of selectedQuestions) {
      await Question.updateOne(
        { id: question.id },
        { $push: { lastUsed: { locationId, date: new Date() } } }
      );
    }

    const accessCode = generateAccessCode();
    const newDeck = new Deck({
      accessCode,
      eventId,
      questions: selectedQuestions.map(q => q._id), // changed from q.id to q._id
      date: new Date()
    });
    await newDeck.save();

    const populatedDeck = await Deck.findOne({ accessCode }).populate('questions');
    return populatedDeck;
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

module.exports = {
  getQuestionCategories,
  getDeckPhases,
  createQuestions,
  recordFeedback,
  getFeedbackStats,
  getAvailableQuestionsForLocation,
  generateQuestionDeck,
  getDeckByAccessCode
};
