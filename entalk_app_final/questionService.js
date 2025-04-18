// questionService.js

const { Question, Feedback } = require('./models');
const { generateAIQuestions } = require('./openai_integration');

// Initialize in-memory arrays
if (!global.questions) global.questions = [];
if (!global.feedback) global.feedback = [];

// Get questions not used recently at a location and matching event
function getAvailableQuestionsForLocation(locationId, days = 28) {
  return global.questions
    .filter(q => !q.wasUsedRecently(locationId, days));
}

// Core deck generator
async function generateQuestionDeck(locationId, eventId) {
  // 1. Filter questions by location and event
  let availableQuestions = getAvailableQuestionsForLocation(locationId);
  availableQuestions = availableQuestions.filter(q => q.eventId === eventId);

  // 2. Score each question
  availableQuestions.forEach(q => q.calculateScore());

  // 3. Select main questions covering categories/phases
  const mainQuestions = selectWithCoverage([...availableQuestions], 12);

  // 4. Select novelty questions (unique/random)
  const noveltyQuestions = selectNoveltyQuestions(
    availableQuestions.filter(q => !mainQuestions.includes(q)),
    4
  );

  // 5. Combine and shuffle
  let selectedQuestions = shuffle([...mainQuestions, ...noveltyQuestions]);

  // 6. Fill with AI if too few
  if (selectedQuestions.length < 16) {
    const missingCount = 16 - selectedQuestions.length;
    const missingCategories = getQuestionCategories()
      .filter(cat => !selectedQuestions.some(q => q.category === cat));
    const missingPhases = getDeckPhases()
      .filter(phase => !selectedQuestions.some(q => q.deckPhase === phase));

    const aiQuestions = await generateAIQuestions(
      missingCategories.length ? missingCategories : getQuestionCategories(),
      missingPhases.length ? missingPhases : getDeckPhases(),
      missingCount
    );

    // Persist AI questions with correct event linkage
    const createdAiQuestions = aiQuestions.map(text =>
      new Question({ text, eventId, locationId, isNovelty: true })
    );
    const savedAi = await Question.insertMany(createdAiQuestions);
    selectedQuestions = [...selectedQuestions, ...savedAi];
  }

  // 7. Save global cache
  selectedQuestions.forEach(q => q.markUsed(locationId));

  return { questions: selectedQuestions };
}

// Export
module.exports = {
  generateQuestionDeck
};
