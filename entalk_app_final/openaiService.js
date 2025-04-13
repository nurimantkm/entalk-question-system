// Updated openaiService.js for compatibility with OpenAI v3.2.1

// Import the OpenAI library correctly for v3.2.1
const { Configuration, OpenAIApi } = require('openai');

// Initialize OpenAI client
let openaiClient = null;

// Initialize OpenAI with API key
function initializeOpenAI(apiKey) {
  try {
    const configuration = new Configuration({
      apiKey: apiKey,
    });
    openaiClient = new OpenAIApi(configuration);
    console.log('OpenAI client initialized successfully');
    return openaiClient;
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
    throw error;
  }
}

// Generate questions using OpenAI
async function generateQuestions(topic, count, category, deckPhase) {
  if (!openaiClient) {
    console.error('OpenAI client not initialized. Please provide a valid API key.');
    // Return mock data instead of throwing an error
    return generateMockQuestions(topic, count, category, deckPhase);
  }

  try {
    console.log(`Generating ${count} questions about ${topic} in category ${category} for phase ${deckPhase}`);
    
    const categoryDescription = getCategoryDescription(category);
    const phaseDescription = getPhaseDescription(deckPhase);

    const prompt = `Generate ${count} engaging conversation questions about ${topic} for English language practice.
Category: ${category} (${categoryDescription})
Deck Phase: ${deckPhase} (${phaseDescription})

Make the questions creative, thought-provoking, and suitable for adult English learners.
Return only the questions as a JSON array of strings.`;

    // Use the correct method for OpenAI v3.2.1
    const response = await openaiClient.createChatCompletion({
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
    console.log('OpenAI response received:', content.substring(0, 100) + '...');
    
    let questions = [];

    try {
      // Try to parse as JSON directly
      if (content.includes('[') && content.includes(']')) {
        const jsonStr = content.substring(
          content.indexOf('['),
          content.lastIndexOf(']') + 1
        );
        questions = JSON.parse(jsonStr);
      } else {
        throw new Error('Response is not in JSON format');
      }
    } catch (e) {
      console.error('Error parsing OpenAI response as JSON:', e);
      // If not valid JSON, extract questions line by line
      questions = content.split('\n')
        .filter(line => line.trim().length > 0 && line.includes('?'))
        .map(line => {
          // Remove numbers, quotes, and other formatting
          return line.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim();
        });
    }

    console.log(`Successfully extracted ${questions.length} questions`);

    // Format questions with category and phase
    return questions.map(text => ({
      text,
      category,
      deckPhase,
      isNovelty: false
    }));
  } catch (error) {
    console.error('Error generating questions with OpenAI:', error);
    // Return mock data instead of throwing an error
    return generateMockQuestions(topic, count, category, deckPhase);
  }
}

// Generate mock questions when OpenAI fails
function generateMockQuestions(topic, count, category, deckPhase) {
  console.log('Generating mock questions as fallback');
  const mockQuestions = [];
  
  for (let i = 0; i < count; i++) {
    mockQuestions.push({
      text: `What do you think about ${topic} in relation to everyday life? (Mock question ${i+1})`,
      category,
      deckPhase,
      isNovelty: false
    });
  }
  
  return mockQuestions;
}

// Generate novelty questions using OpenAI
async function generateNoveltyQuestions(count) {
  if (!openaiClient) {
    console.error('OpenAI client not initialized. Please provide a valid API key.');
    // Return mock data instead of throwing an error
    return generateMockNoveltyQuestions(count);
  }

  try {
    console.log(`Generating ${count} novelty questions`);
    
    const prompt = `Generate ${count} unusual, creative, and thought-provoking conversation questions for English language practice.
These should be unique, unexpected questions that make people think differently.
Return only the questions as a JSON array of strings.`;

    // Use the correct method for OpenAI v3.2.1
    const response = await openaiClient.createChatCompletion({
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
    console.log('OpenAI response received for novelty questions');
    
    let questions = [];

    try {
      // Try to parse as JSON directly
      if (content.includes('[') && content.includes(']')) {
        const jsonStr = content.substring(
          content.indexOf('['),
          content.lastIndexOf(']') + 1
        );
        questions = JSON.parse(jsonStr);
      } else {
        throw new Error('Response is not in JSON format');
      }
    } catch (e) {
      console.error('Error parsing OpenAI response as JSON:', e);
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
    // Return mock data instead of throwing an error
    return generateMockNoveltyQuestions(count);
  }
}

// Generate mock novelty questions when OpenAI fails
function generateMockNoveltyQuestions(count) {
  console.log('Generating mock novelty questions as fallback');
  
  const mockQuestions = [
    "If your life had a soundtrack, which song would be playing right now?",
    "What's the strangest talent you have that few people know about?",
    "If you could instantly become an expert in something, what would it be?",
    "What's the most unusual food combination you enjoy?",
    "If you could have dinner with any fictional character, who would it be?"
  ];
  
  // Randomly assign categories and phases
  const categories = [
    'Icebreaker', 'Personal', 'Opinion', 
    'Hypothetical', 'Reflective', 'Cultural'
  ];
  
  const phases = [
    'Warm-Up', 'Personal', 'Reflective', 'Challenge'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({
      text: mockQuestions[i % mockQuestions.length],
      category: categories[Math.floor(Math.random() * categories.length)],
      deckPhase: phases[Math.floor(Math.random() * phases.length)],
      isNovelty: true
    });
  }
  
  return result;
}

// Fill missing categories with AI-generated questions
async function fillMissingCategories(missingCategories, count = 1) {
  if (!openaiClient) {
    console.error('OpenAI client not initialized. Please provide a valid API key.');
    // Return mock data instead of throwing an error
    return generateMockCategoryQuestions(missingCategories, count);
  }

  const result = [];

  for (const category of missingCategories) {
    try {
      console.log(`Generating ${count} questions for missing category: ${category}`);
      
      const categoryDescription = getCategoryDescription(category);
      
      const prompt = `Generate ${count} engaging conversation questions for English language practice.
Category: ${category} (${categoryDescription})
Make the questions creative, thought-provoking, and suitable for adult English learners.
Return only the questions as a JSON array of strings.`;

      // Use the correct method for OpenAI v3.2.1
      const response = await openaiClient.createChatCompletion({
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
        if (content.includes('[') && content.includes(']')) {
          const jsonStr = content.substring(
            content.indexOf('['),
            content.lastIndexOf(']') + 1
          );
          questions = JSON.parse(jsonStr);
        } else {
          throw new Error('Response is not in JSON format');
        }
      } catch (e) {
        console.error('Error parsing OpenAI response as JSON:', e);
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
      // Add mock questions for this category
      const mockQuestions = generateMockCategoryQuestions([category], count);
      result.push(...mockQuestions);
    }
  }

  return result;
}

// Generate mock category questions when OpenAI fails
function generateMockCategoryQuestions(categories, count = 1) {
  console.log('Generating mock category questions as fallback');
  
  const result = [];
  const phases = ['Warm-Up', 'Personal', 'Reflective', 'Challenge'];
  
  for (const category of categories) {
    for (let i = 0; i < count; i++) {
      result.push({
        text: `A sample ${category} question for conversation practice? (Mock question)`,
        category,
        deckPhase: phases[Math.floor(Math.random() * phases.length)],
        isNovelty: false
      });
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
