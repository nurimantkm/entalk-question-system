// Events page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the events page
    if (window.location.pathname.includes('events.html')) {
        init();
    }
});

// Check if user is authenticated (if not defined in app.js)
if (typeof isAuthenticated !== 'function') {
    function isAuthenticated() {
        return localStorage.getItem('token') !== null;
    }
}

// API request helper function (if not defined elsewhere)
async function apiRequest(endpoint, method, data) {
    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: data ? JSON.stringify(data) : undefined
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.msg || 'Request failed');
        }
        
        return responseData;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Show alert function (if not defined elsewhere)
function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        console.warn('Alert container not found');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.display = 'block';
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Remove alert after 3 seconds
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// Initialize the page
async function init() {
  try {
    // Redirect if not authenticated
    if (!isAuthenticated()) {
      window.location.href = '/login.html';
      return;
    }
    
    // Load data
    try {
      await loadCategoriesAndPhases();
    } catch (error) {
      console.error('Error loading categories and phases:', error);
      // Add this line to use default values if API fails
      initializeDefaultCategoriesAndPhases();
    }
    
    // Rest of your init function...
  } catch (error) {
    console.error('Error initializing page:', error);
  }
}

// Load question categories and phases
async function loadCategoriesAndPhases() {
    try {
        // Load categories
        const categoriesResponse = await apiRequest('/api/questions/categories', 'GET');
        const categoryDropdown = document.getElementById('question-category');
        if (categoryDropdown) {
            populateDropdown(categoryDropdown, categoriesResponse);
        } else {
            console.warn('Category dropdown not found');
        }
        
        // Load phases
        const phasesResponse = await apiRequest('/api/questions/phases', 'GET');
        const phaseDropdown = document.getElementById('question-phase');
        if (phaseDropdown) {
            populateDropdown(phaseDropdown, phasesResponse);
        } else {
            console.warn('Phase dropdown not found');
        }
    } catch (error) {
        console.error('Error loading categories and phases:', error);
        throw error;
    }
}

// Load locations
async function loadLocations() {
    try {
        const locationsResponse = await apiRequest('/api/locations', 'GET');
        const locationDropdown = document.getElementById('location-select');
        if (locationDropdown) {
            populateDropdown(locationDropdown, locationsResponse, 'id', 'name');
        } else {
            console.warn('Location dropdown not found');
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        throw error;
    }
}

// Populate dropdown with options
function populateDropdown(dropdown, items, valueKey = null, textKey = null) {
    if (!dropdown) {
        console.warn('Dropdown element is null');
        return;
    }
    
    dropdown.innerHTML = '';
    
    if (Array.isArray(items)) {
        items.forEach(item => {
            const option = document.createElement('option');
            
            if (valueKey && textKey) {
                option.value = item[valueKey];
                option.textContent = item[textKey];
            } else {
                option.value = item;
                option.textContent = item;
            }
            
            dropdown.appendChild(option);
        });
    } else {
        console.warn('Items is not an array:', items);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Create event form
    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
        createEventForm.addEventListener('submit', handleCreateEvent);
    } else {
        console.warn('Create event form not found');
    }
    
    // Generate questions form
    const generateQuestionsForm = document.getElementById('generate-questions-form');
    if (generateQuestionsForm) {
        generateQuestionsForm.addEventListener('submit', handleGenerateQuestions);
    } else {
        console.warn('Generate questions form not found');
    }
    
    // Generate deck form
    const generateDeckForm = document.getElementById('generate-deck-form');
    if (generateDeckForm) {
        generateDeckForm.addEventListener('submit', handleGenerateDeck);
    } else {
        console.warn('Generate deck form not found');
    }
}

// Load events
async function loadEvents() {
    try {
        const events = await apiRequest('/api/events', 'GET');
        const eventsList = document.getElementById('events-list');
        const eventSelect = document.getElementById('event-select');
        
        if (eventsList) {
            eventsList.innerHTML = '';
            
            if (events.length === 0) {
                eventsList.innerHTML = '<p>No events found. Create your first event!</p>';
            } else {
                events.forEach(event => {
                    const eventItem = document.createElement('div');
                    eventItem.className = 'event-item';
                    eventItem.innerHTML = `
                        <h3>${event.name}</h3>
                        <p>${event.description}</p>
                        <p>Date: ${new Date(event.date).toLocaleDateString()}</p>
                        <button class="btn btn-primary select-event" data-id="${event.id}">Select</button>
                    `;
                    eventsList.appendChild(eventItem);
                });
                
                // Add event listeners to select buttons
                const selectButtons = document.querySelectorAll('.select-event');
                selectButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const eventId = button.getAttribute('data-id');
                        selectEvent(eventId);
                    });
                });
            }
        } else {
            console.warn('Events list element not found');
        }
        
        // Populate event select dropdown
        if (eventSelect) {
            populateDropdown(eventSelect, events, 'id', 'name');
        } else {
            console.warn('Event select dropdown not found');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        throw error;
    }
}

// Handle create event form submission
async function handleCreateEvent(e) {
    e.preventDefault();
    
    const name = document.getElementById('event-name').value;
    const description = document.getElementById('event-description').value;
    const date = document.getElementById('event-date').value;
    const locationId = document.getElementById('location-select').value;
    
    try {
        const event = await apiRequest('/api/events', 'POST', {
            name,
            description,
            date,
            locationId
        });
        
        showAlert('Event created successfully!', 'success');
        
        // Reset form
        document.getElementById('create-event-form').reset();
        
        // Reload events
        await loadEvents();
    } catch (error) {
        showAlert(error.message || 'Failed to create event');
    }
}

// Handle generate questions form submission
async function handleGenerateQuestions(e) {
    e.preventDefault();
    
    const topic = document.getElementById('question-topic').value;
    const count = document.getElementById('question-count').value;
    const category = document.getElementById('question-category').value;
    const deckPhase = document.getElementById('question-phase').value;
    
    try {
        const response = await apiRequest('/api/questions/generate', 'POST', {
            topic,
            count: parseInt(count),
            category,
            deckPhase
        });
        
        // Display generated questions
        const questionsContainer = document.getElementById('generated-questions');
        if (questionsContainer) {
            questionsContainer.innerHTML = '<h3>Generated Questions:</h3>';
            
            const questionsList = document.createElement('ul');
            response.questions.forEach(question => {
                const questionItem = document.createElement('li');
                questionItem.textContent = question.text;
                questionsList.appendChild(questionItem);
            });
            
            questionsContainer.appendChild(questionsList);
            
            // Show save button
            const saveQuestionsBtn = document.getElementById('save-questions-btn');
            if (saveQuestionsBtn) {
                saveQuestionsBtn.style.display = 'block';
                saveQuestionsBtn.addEventListener('click', () => {
                    saveQuestions(response.questions);
                });
            }
        }
        
        showAlert('Questions generated successfully!', 'success');
    } catch (error) {
        showAlert(error.message || 'Failed to generate questions');
    }
}

// Save generated questions
async function saveQuestions(questions) {
    const eventId = document.getElementById('event-select').value;
    
    if (!eventId) {
        showAlert('Please select an event');
        return;
    }
    
    try {
        await apiRequest('/api/questions', 'POST', {
            questions,
            eventId
        });
        
        showAlert('Questions saved successfully!', 'success');
    } catch (error) {
        showAlert(error.message || 'Failed to save questions');
    }
}

// Handle generate deck form submission
async function handleGenerateDeck(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('event-select').value;
    const locationId = document.getElementById('location-select').value;
    
    if (!eventId) {
        showAlert('Please select an event');
        return;
    }
    
    if (!locationId) {
        showAlert('Please select a location');
        return;
    }
    
    try {
        const deck = await apiRequest(`/api/decks/generate/${locationId}`, 'POST', {
            eventId
        });
        
        // Display deck info
        const deckInfoContainer = document.getElementById('deck-info');
        if (deckInfoContainer) {
            deckInfoContainer.innerHTML = `
                <h3>Deck Generated!</h3>
                <p>Access Code: <strong>${deck.accessCode}</strong></p>
                <p>Questions: ${deck.questions.length}</p>
                <p>Location: ${deck.locationName}</p>
                <button id="show-qr-btn" class="btn btn-primary">Show QR Code</button>
            `;
            
            // Add event listener to QR code button
            const showQrBtn = document.getElementById('show-qr-btn');
            if (showQrBtn) {
                showQrBtn.addEventListener('click', () => {
                    showQrCode(deck.accessCode);
                });
            }
        }
        
        showAlert('Deck generated successfully!', 'success');
    } catch (error) {
        showAlert(error.message || 'Failed to generate deck');
    }
}

// Show QR code for deck access
function showQrCode(accessCode) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/participant.html?code=${accessCode}`;
    
    const qrContainer = document.getElementById('qr-container') ;
    if (qrContainer) {
        qrContainer.innerHTML = `
            <h3>QR Code</h3>
            <img src="${qrUrl}" alt="QR Code">
            <p>Scan this code or share this link:</p>
            <p><a href="${window.location.origin}/participant.html?code=${accessCode}" target="_blank">${window.location.origin}/participant.html?code=${accessCode}</a></p>
        `;
    }
}
// Select an event
function selectEvent(eventId) {
    const eventSelect = document.getElementById('event-select');
    if (eventSelect) {
        eventSelect.value = eventId;
        
        // Show the questions and deck sections
        const questionsSection = document.getElementById('questions-section');
        const deckSection = document.getElementById('deck-section');
        
        if (questionsSection) questionsSection.style.display = 'block';
        if (deckSection) deckSection.style.display = 'block';
        
        showAlert('Event selected!', 'success');
    }
}

// Add this function to your events.js file
function initializeDefaultCategoriesAndPhases() {
  // Default categories
  const defaultCategories = [
    'Icebreaker',
    'Personal',
    'Opinion',
    'Reflective',
    'Hypothetical',
    'Challenge'
  ];
  
  // Default phases
  const defaultPhases = [
    'Warm-Up',
    'Personal',
    'Reflective',
    'Challenge'
  ];
  
  // Populate category dropdown
  const categoryDropdown = document.getElementById('question-category');
  if (categoryDropdown) {
    populateDropdown(categoryDropdown, defaultCategories);
  }
  
  // Populate phase dropdown
  const phaseDropdown = document.getElementById('question-phase');
  if (phaseDropdown) {
    populateDropdown(phaseDropdown, defaultPhases);
  }
}

// Call this function in your init() function
// Add this line after the loadCategoriesAndPhases() call:
// initializeDefaultCategoriesAndPhases();
