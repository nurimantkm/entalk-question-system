// openaiService.js - Service for OpenAI integration

const { Configuration, OpenAIApi } = require('openai');

// Initialize OpenAI configuration
let openai = null;

// Initialize OpenAI with API key
function initializeOpenAI(apiKey) {
  const configuration = new Configuration({
    apiKey: apiKey,
  });
  openai = new OpenAIApi(configuration);
  return openai;
}

// Generate questions using OpenAI
async function generateQuestions(topic, count, category, deckPhase) {
  if (!openai) {
    throw new Error('OpenAI not initialized. Please provide an API key.');
  }

  try {
    const categoryDescription = getCategoryDescription(category);
    const phaseDescription = getPhaseDescription(deckPhase);

    const prompt = `Generate ${count} engaging conversation questions about ${topic} for English language practice.
Category: ${category} (${categoryDescription})
Deck Phase: ${deckPhase} (${phaseDescription})

Make the questions creative, thought-provoking, and suitable for adult English learners.
Return only the questions as a JSON array of strings.`;

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates engaging conversation questions." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 1000
    });

    // Parse the response to extract questions
    const content = response.data.choices[0].message.content;
    let questions = [];

    try {
      // Try to parse as JSON directly
      questions = JSON.parse(content);
    } catch (e) {
      // If not valid JSON, extract questions line by line
      questions = content.split('\n')
        .filter(line => line.trim().length > 0 && line.includes('?'))
        .map(line => {
          // Remove numbers, quotes, and other formatting
          return line.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim();
        });
    }

    // Format questions with category and phase
    return questions.map(text => ({
      text,
      category,
      deckPhase,
      isNovelty: false
    }));
  } catch (error) {
    console.error('Error generating questions with OpenAI:', error);
    throw error;
  }
}

// Generate novelty questions using OpenAI
async function generateNoveltyQuestions(count) {
  if (!openai) {
    throw new Error('OpenAI not initialized. Please provide an API key.');
  }

  try {
    const prompt = `Generate ${count} unusual, creative, and thought-provoking conversation questions for English language practice.
These should be unique, unexpected questions that make people think differently.
Return only the questions as a JSON array of strings.`;

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a creative assistant that generates unusual and thought-provoking conversation questions." },
        { role: "user", content: prompt }
      ],
      temperature: 1.0,
      max_tokens: 1000
    });

    // Parse the response to extract questions
    const content = response.data.choices[0].message.content;
    let questions = [];

    try {
      // Try to parse as JSON directly
      questions = JSON.parse(content);
    } catch (e) {
      // If not valid JSON, extract questions line by line
      questions = content.split('\n')
        .filter(line => line.trim().length > 0 && line.includes('?'))
        .map(line => {
          // Remove numbers, quotes, and other formatting
          return line.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim();
        });
    }

    // Randomly assign categories and phases to novelty questions
    const categories = [
      'Icebreaker', 'Personal', 'Opinion', 
      'Hypothetical', 'Reflective', 'Cultural'
    ];
    
    const phases = [
      'Warm-Up', 'Personal', 'Reflective', 'Challenge'
    ];

    // Format questions with random category and phase, marked as novelty
    return questions.map(text => ({
      text,
      category: categories[Math.floor(Math.random() * categories.length)],
      deckPhase: phases[Math.floor(Math.random() * phases.length)],
      isNovelty: true
    }));
  } catch (error) {
    console.error('Error generating novelty questions with OpenAI:', error);
    throw error;
  }
}

// Fill missing categories with AI-generated questions
async function fillMissingCategories(missingCategories, count = 1) {
  if (!openai) {
    throw new Error('OpenAI not initialized. Please provide an API key.');
  }

  const result = [];

  for (const category of missingCategories) {
    try {
      const categoryDescription = getCategoryDescription(category);
      
      const prompt = `Generate ${count} engaging conversation questions for English language practice.
Category: ${category} (${categoryDescription})
Make the questions creative, thought-provoking, and suitable for adult English learners.
Return only the questions as a JSON array of strings.`;

      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates engaging conversation questions." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 500
      });

      // Parse the response to extract questions
      const content = response.data.choices[0].message.content;
      let questions = [];

      try {
        // Try to parse as JSON directly
        questions = JSON.parse(content);
      } catch (e) {
        // If not valid JSON, extract questions line by line
        questions = content.split('\n')
          .filter(line => line.trim().length > 0 && line.includes('?'))
          .map(line => {
            // Remove numbers, quotes, and other formatting
            return line.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim();
          });
      }

      // Randomly assign phases to questions
      const phases = [
        'Warm-Up', 'Personal', 'Reflective', 'Challenge'
      ];

      // Format questions with category and random phase
      const formattedQuestions = questions.map(text => ({
        text,
        category,
        deckPhase: phases[Math.floor(Math.random() * phases.length)],
        isNovelty: false
      }));

      result.push(...formattedQuestions);
    } catch (error) {
      console.error(`Error generating questions for category ${category}:`, error);
      // Continue with other categories even if one fails
    }
  }

  return result;
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

module.exports = {
  initializeOpenAI,
  generateQuestions,
  generateNoveltyQuestions,
  fillMissingCategories
};
