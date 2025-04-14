// Updated openaiService.js with improved mock question generation

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
    // Return improved mock data instead of throwing an error
    return generateImprovedMockQuestions(topic, count, category, deckPhase);
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
    // Return improved mock data instead of throwing an error
    return generateImprovedMockQuestions(topic, count, category, deckPhase);
  }
}

// Generate improved mock questions when OpenAI fails
function generateImprovedMockQuestions(topic, count, category, deckPhase) {
  console.log('Generating improved mock questions as fallback');
  
  // Define question templates based on category and phase
  const templates = {
    'Icebreaker': {
      'Warm-Up': [
        `Have you ever used ${topic} in your daily life?`,
        `What's the first thing that comes to mind when you think about ${topic}?`,
        `Do you enjoy discussing ${topic} with friends?`,
        `How often do you encounter ${topic} in your everyday routine?`,
        `What's your initial reaction when someone mentions ${topic}?`
      ],
      'Personal': [
        `What was your first experience with ${topic}?`,
        `How has ${topic} influenced your personal life?`,
        `When did you first become interested in ${topic}?`,
        `What aspects of ${topic} do you find most appealing?`,
        `Has your opinion about ${topic} changed over time?`
      ],
      'Reflective': [
        `What lessons have you learned from ${topic}?`,
        `How has ${topic} shaped your worldview?`,
        `What would life be like without ${topic}?`,
        `In what ways has ${topic} surprised you?`,
        `What misconceptions did you once have about ${topic}?`
      ],
      'Challenge': [
        `What are the ethical implications of ${topic}?`,
        `How might ${topic} evolve in the next decade?`,
        `What contradictions exist within ${topic}?`,
        `How would you explain ${topic} to someone from a completely different culture?`,
        `What's the most challenging aspect of understanding ${topic}?`
      ]
    },
    'Personal': {
      'Warm-Up': [
        `How does ${topic} relate to your personal interests?`,
        `What role does ${topic} play in your life?`,
        `Do you have any personal stories involving ${topic}?`,
        `How would your friends describe your relationship with ${topic}?`,
        `What personal benefits have you gained from ${topic}?`
      ],
      'Personal': [
        `How has your background influenced your perspective on ${topic}?`,
        `What personal values guide your approach to ${topic}?`,
        `How do you incorporate ${topic} into your daily routine?`,
        `What personal goals do you have related to ${topic}?`,
        `How has your relationship with ${topic} evolved over time?`
      ],
      'Reflective': [
        `What has ${topic} taught you about yourself?`,
        `How might your life be different without exposure to ${topic}?`,
        `What personal strengths have you developed through ${topic}?`,
        `How has ${topic} challenged your personal beliefs?`,
        `What personal insights have you gained from ${topic}?`
      ],
      'Challenge': [
        `How do you reconcile conflicting perspectives about ${topic} in your personal life?`,
        `What personal sacrifices have you made because of ${topic}?`,
        `How do you maintain authenticity when engaging with ${topic}?`,
        `What personal boundaries have you established regarding ${topic}?`,
        `How do you navigate personal disagreements about ${topic}?`
      ]
    },
    'Opinion': {
      'Warm-Up': [
        `What's your general opinion about ${topic}?`,
        `Do you think ${topic} is generally viewed positively or negatively?`,
        `What aspects of ${topic} do you find most interesting?`,
        `How important do you think ${topic} is in today's world?`,
        `What's one thing you appreciate about ${topic}?`
      ],
      'Personal': [
        `How have your personal experiences shaped your opinion of ${topic}?`,
        `What factors influenced your current view on ${topic}?`,
        `Has your opinion about ${topic} changed significantly over time?`,
        `What would make you reconsider your position on ${topic}?`,
        `How do your opinions about ${topic} compare to those of your family or friends?`
      ],
      'Reflective': [
        `What underlying values inform your opinion about ${topic}?`,
        `How do you respond when others strongly disagree with your views on ${topic}?`,
        `What are the limitations of your current understanding of ${topic}?`,
        `How might your cultural background influence your perspective on ${topic}?`,
        `What contradictions might exist in your views about ${topic}?`
      ],
      'Challenge': [
        `What's the strongest argument against your position on ${topic}?`,
        `How might future developments change the way we think about ${topic}?`,
        `What ethical considerations complicate discussions about ${topic}?`,
        `How do you distinguish between facts and opinions when discussing ${topic}?`,
        `What responsibility do individuals have regarding ${topic}?`
      ]
    },
    'Hypothetical': {
      'Warm-Up': [
        `What if ${topic} suddenly disappeared from our lives?`,
        `How would your daily routine change if ${topic} became twice as important?`,
        `What if everyone had equal access to ${topic}?`,
        `Imagine ${topic} was just invented yesterday - how would society react?`,
        `What if you became an expert on ${topic} overnight?`
      ],
      'Personal': [
        `If you could change one thing about ${topic}, what would it be?`,
        `How might your life be different if you had discovered ${topic} earlier?`,
        `If you had to teach someone about ${topic}, what approach would you take?`,
        `What if your perspective on ${topic} was completely reversed?`,
        `If ${topic} became your profession, how would that change your relationship with it?`
      ],
      'Reflective': [
        `What if future generations viewed ${topic} completely differently than we do?`,
        `How might ${topic} evolve over the next century?`,
        `What if we discovered everything we knew about ${topic} was wrong?`,
        `If ${topic} could speak, what would it say about humanity?`,
        `What hidden potential might ${topic} have that we haven't yet discovered?`
      ],
      'Challenge': [
        `What if ${topic} became the central organizing principle of society?`,
        `How would an alien civilization approach ${topic}?`,
        `What philosophical questions does ${topic} raise about human existence?`,
        `If you had to debate both sides of a controversial aspect of ${topic}, how would you prepare?`,
        `What paradoxes exist within our understanding of ${topic}?`
      ]
    },
    'Reflective': {
      'Warm-Up': [
        `What aspects of ${topic} make you curious?`,
        `How has your understanding of ${topic} evolved over time?`,
        `What questions about ${topic} remain unanswered for you?`,
        `What surprises you most about ${topic}?`,
        `How do you feel when engaging with ${topic}?`
      ],
      'Personal': [
        `How has ${topic} influenced your personal growth?`,
        `What personal insights have you gained through ${topic}?`,
        `How does ${topic} connect to your core values?`,
        `What personal biases might affect your perception of ${topic}?`,
        `How has ${topic} challenged or reinforced your identity?`
      ],
      'Reflective': [
        `What deeper truths might ${topic} reveal about human nature?`,
        `How does ${topic} reflect broader patterns in society?`,
        `What contradictions or paradoxes exist within ${topic}?`,
        `How might future generations view our current approach to ${topic}?`,
        `What wisdom can be found in how different cultures approach ${topic}?`
      ],
      'Challenge': [
        `How does ${topic} challenge conventional wisdom?`,
        `What systemic factors shape our collective understanding of ${topic}?`,
        `How might ${topic} be connected to larger questions of meaning and purpose?`,
        `What responsibilities come with knowledge about ${topic}?`,
        `How might we transcend current limitations in our approach to ${topic}?`
      ]
    },
    'Cultural': {
      'Warm-Up': [
        `How is ${topic} viewed in your culture?`,
        `What cultural differences have you noticed in approaches to ${topic}?`,
        `How has ${topic} been represented in popular media?`,
        `What cultural traditions are associated with ${topic}?`,
        `How has the cultural significance of ${topic} changed over time?`
      ],
      'Personal': [
        `How has your cultural background influenced your relationship with ${topic}?`,
        `What cultural values shape your approach to ${topic}?`,
        `How do you navigate cultural differences when discussing ${topic}?`,
        `What aspects of ${topic} do you find unique to your cultural experience?`,
        `How has exposure to different cultures changed your perspective on ${topic}?`
      ],
      'Reflective': [
        `What can we learn about a culture by examining its approach to ${topic}?`,
        `How might ${topic} serve as a bridge between different cultures?`,
        `What cultural assumptions underlie common perspectives on ${topic}?`,
        `How does ${topic} reflect broader cultural values and priorities?`,
        `What cultural innovations have emerged around ${topic}?`
      ],
      'Challenge': [
        `How might cultural biases limit our understanding of ${topic}?`,
        `What cultural conflicts arise around different approaches to ${topic}?`,
        `How can we respectfully engage with cultural differences regarding ${topic}?`,
        `What responsibility do we have to preserve cultural knowledge about ${topic}?`,
        `How might globalization affect cultural diversity in approaches to ${topic}?`
      ]
    }
  };
  
  // Fallback templates if category or phase isn't found
  const fallbackTemplates = [
    `What are your thoughts about ${topic}?`,
    `How does ${topic} impact your daily life?`,
    `What interesting aspects of ${topic} would you like to explore?`,
    `How has your perspective on ${topic} changed over time?`,
    `What questions do you have about ${topic}?`
  ];
  
  const mockQuestions = [];
  
  for (let i = 0; i < count; i++) {
    let questionText;
    
    // Get templates for the specified category and phase
    const categoryTemplates = templates[category];
    if (categoryTemplates) {
      const phaseTemplates = categoryTemplates[deckPhase];
      if (phaseTemplates && phaseTemplates.length > 0) {
        // Use template from the specified category and phase
        questionText = phaseTemplates[i % phaseTemplates.length];
      } else {
        // Fallback to any template from the category
        const allPhaseTemplates = Object.values(categoryTemplates).flat();
        questionText = allPhaseTemplates[i % allPhaseTemplates.length];
      }
    } else {
      // Use fallback template
      questionText = fallbackTemplates[i % fallbackTemplates.length];
    }
    
    mockQuestions.push({
      text: questionText,
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
    // Return improved mock data instead of throwing an error
    return generateImprovedMockNoveltyQuestions(count);
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
          con
(Content truncated due to size limit. Use line ranges to read in chunks)
        
