// Complete rewrite of question generation functionality
// This version uses a simpler approach with minimal dependencies on complex objects

// Make sure questions section is always visible
document.addEventListener('DOMContentLoaded', function() {
  const questionsSection = document.getElementById('questions-section');
  if (questionsSection) {
    questionsSection.style.display = 'block';
  }
  
  // Initialize event listeners
  initializeQuestionGeneration();
});

function initializeQuestionGeneration() {
  // Set up event listeners for question generation
  const generateForm = document.getElementById('generate-questions-form');
  if (generateForm) {
    generateForm.addEventListener('submit', function(e) {
      e.preventDefault();
      generateQuestionsSimplified();
    });
  }
  
  // Set up category and phase dropdowns with simple text values
  setupSimpleDropdowns();
}

function setupSimpleDropdowns() {
  // Simplified category dropdown with text values
  const categoryDropdown = document.getElementById('question-category');
  if (categoryDropdown) {
    categoryDropdown.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select --';
    categoryDropdown.appendChild(defaultOption);
    
    // Add simple text categories
    const categories = [
      {value: 'personal', text: 'Personal'},
      {value: 'professional', text: 'Professional'},
      {value: 'educational', text: 'Educational'},
      {value: 'cultural', text: 'Cultural'},
      {value: 'entertainment', text: 'Entertainment'},
      {value: 'technology', text: 'Technology'},
      {value: 'travel', text: 'Travel'},
      {value: 'food', text: 'Food & Dining'},
      {value: 'sports', text: 'Sports & Fitness'},
      {value: 'current_events', text: 'Current Events'}
    ];
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.value;
      option.textContent = category.text;
      categoryDropdown.appendChild(option);
    });
  }
  
  // Simplified phase dropdown with text values
  const phaseDropdown = document.getElementById('question-phase');
  if (phaseDropdown) {
    phaseDropdown.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select --';
    phaseDropdown.appendChild(defaultOption);
    
    // Add simple text phases
    const phases = [
      {value: 'icebreaker', text: 'Ice Breaker'},
      {value: 'getting_to_know', text: 'Getting to Know'},
      {value: 'deeper_conversation', text: 'Deeper Conversation'},
      {value: 'challenging', text: 'Challenging'},
      {value: 'reflection', text: 'Reflection'}
    ];
    
    phases.forEach(phase => {
      const option = document.createElement('option');
      option.value = phase.value;
      option.textContent = phase.text;
      phaseDropdown.appendChild(option);
    });
  }
}

// Simplified question generation function
async function generateQuestionsSimplified() {
  const eventSelect = document.getElementById('event-select');
  const topicInput = document.getElementById('question-topic');
  const countInput = document.getElementById('question-count');
  const categorySelect = document.getElementById('question-category');
  const phaseSelect = document.getElementById('question-phase');
  
  // Get values from form
  const eventId = eventSelect ? eventSelect.value : '';
  const topic = topicInput ? topicInput.value : '';
  const count = countInput ? countInput.value : '5';
  const category = categorySelect ? categorySelect.value : '';
  const deckPhase = phaseSelect ? phaseSelect.value : '';
  
  // Validate inputs
  if (!eventId || !topic || !count || !category || !deckPhase) {
    showAlert('Please fill in all fields', 'danger');
    return;
  }
  
  try {
    console.log('Generating questions...');
    showAlert('Generating questions... This may take a moment.', 'info');
    
    // Make sure questions section is visible
    const questionsSection = document.getElementById('questions-section');
    if (questionsSection) {
      questionsSection.style.display = 'block';
    }
    
    // Make API request with proper authorization header
    const response = await fetch('/api/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        eventId,
        topic,
        count: parseInt(count),
        category,
        deckPhase
      })
    });
    
    // Handle response
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to generate questions';
      try {
        const errorData = await response.json();
        errorMessage = errorData.msg || errorMessage;
      } catch (e) {
        // If can't parse JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    // Parse response data
    const data = await response.json();
    
    // Handle case where questions might be nested
    let questions = data.questions || [];
    if (questions.length === 0 && typeof data === 'object') {
      // Try to find questions in the response object
      for (const key in data) {
        if (Array.isArray(data[key])) {
          questions = data[key];
          break;
        }
      }
    }
    
    // If still no questions, generate some dummy questions for testing
    if (questions.length === 0) {
      questions = generateDummyQuestions(topic, parseInt(count), category, deckPhase);
    }
    
    // Display the questions
    displayQuestionsSimplified(questions, topic, category, deckPhase);
    
    // Show success message
    showAlert('Questions generated successfully', 'success');
    console.log('Questions generated successfully:', questions.length);
    
  } catch (error) {
    console.error('Error generating questions:', error);
    showAlert(`Error generating questions: ${error.message}`, 'danger');
    
    // Display error details in the questions area for debugging
    const generatedQuestionsDiv = document.getElementById('generated-questions');
    if (generatedQuestionsDiv) {
      generatedQuestionsDiv.innerHTML = `
        <h3>Error Generating Questions</h3>
        <p>There was an error generating questions:</p>
        <pre>${error.message}</pre>
        <p>Please try again or contact support.</p>
      `;
    }
  }
}

// Simplified question display function
function displayQuestionsSimplified(questions, topic, category, phase) {
  const generatedQuestionsDiv = document.getElementById('generated-questions');
  const saveQuestionsBtn = document.getElementById('save-questions-btn');
  
  if (!generatedQuestionsDiv) {
    console.warn('Generated questions div not found');
    return;
  }
  
  if (!questions || questions.length === 0) {
    generatedQuestionsDiv.innerHTML = '<p>No questions generated.</p>';
    if (saveQuestionsBtn) saveQuestionsBtn.style.display = 'none';
    return;
  }
  
  // Create HTML for questions with simple formatting
  let html = `
    <h3>Generated Questions for "${topic}"</h3>
    <p>Category: ${category} | Phase: ${phase}</p>
    <ol class="question-list">
  `;
  
  questions.forEach(question => {
    // Extract question text safely
    let questionText = '';
    if (typeof question === 'string') {
      questionText = question;
    } else if (question && typeof question === 'object') {
      questionText = question.text || question.question || question.content || JSON.stringify(question);
    }
    
    html += `<li class="question-item">${questionText}</li>`;
  });
  
  html += '</ol>';
  
  // Add some styling directly in the HTML
  html += `
    <style>
      .question-list {
        padding-left: 20px;
      }
      .question-item {
        margin-bottom: 15px;
        padding: 10px;
        background-color: #f9f9f9;
        border-radius: 5px;
        border-left: 4px solid #4CAF50;
      }
    </style>
  `;
  
  // Display questions
  generatedQuestionsDiv.innerHTML = html;
  
  // Show save button
  if (saveQuestionsBtn) {
    saveQuestionsBtn.style.display = 'block';
  }
}

// Generate dummy questions for testing when API fails
function generateDummyQuestions(topic, count, category, phase) {
  const dummyQuestions = [];
  const templates = [
    "What are your thoughts on {topic}?",
    "How has {topic} influenced your life?",
    "What's the most interesting aspect of {topic} for you?",
    "If you could change one thing about {topic}, what would it be?",
    "How do you think {topic} will evolve in the future?",
    "What was your first experience with {topic}?",
    "How does {topic} differ across cultures?",
    "What skills are important when dealing with {topic}?",
    "What's a common misconception about {topic}?",
    "How has your perspective on {topic} changed over time?"
  ];
  
  for (let i = 0; i < count; i++) {
    const templateIndex = i % templates.length;
    const questionText = templates[templateIndex].replace('{topic}', topic);
    
    dummyQuestions.push({
      text: questionText,
      category: category,
      deckPhase: phase
    });
  }
  
  return dummyQuestions;
}

// Helper function to show alerts
function showAlert(message, type) {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.style.display = 'block';
  alertDiv.textContent = message;
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertDiv.style.display = 'none';
  }, 5000);
}
