// Update server.js to integrate OpenAI service

// Add this near the top of server.js after other requires
const openaiService = require('./openaiService');

// Initialize OpenAI with API key if available
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (OPENAI_API_KEY) {
  openaiService.initializeOpenAI(OPENAI_API_KEY);
  console.log('OpenAI service initialized');
} else {
  console.log('OpenAI API key not found, using mock data for question generation');
}

// Then replace the existing /api/questions/generate endpoint with this:

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

// And replace the /api/questions/generate-ai endpoint with this:

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
