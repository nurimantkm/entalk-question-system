// events.js

// Define populateDropdown function first
function populateDropdown(selectElement, options, values = null) {
    if (!selectElement) {
        console.warn('Cannot populate dropdown: select element is null');
        return;
    }
    
    // Clear existing options
    selectElement.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select --';
    selectElement.appendChild(defaultOption);
    
    options.forEach((option, index) => {
        const optionElement = document.createElement('option');
        let optionValue;
        let optionText;
        
        if (values && values[index]) {
            optionValue = values[index];
        } else if (typeof option === 'object' && option !== null) {
            optionValue = option.id || '';
        } else {
            optionValue = option;
        }
        
        if (typeof option === 'object' && option !== null) {
            optionText = option.name || JSON.stringify(option);
        } else {
            optionText = option;
        }
        
        optionElement.value = optionValue;
        optionElement.textContent = optionText;
        selectElement.appendChild(optionElement);
    });
}

// Global variables
let currentEventId = '';
let currentQuestions = [];

// Initialize the page once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    init();
});

// Initialize the page
async function init() {
    try {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        
        console.log('Initializing events page...');
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize default categories and phases
        initializeDefaultCategoriesAndPhases();
        
        // Load locations and events from API or use defaults
        await loadLocations();
        await loadEvents();
        
        // Load categories and phases for dropdowns (will fall back to defaults if API fails)
        await loadCategoriesAndPhases();
        
        console.log('Events page initialized successfully');
    } catch (error) {
        console.error('Error initializing page:', error);
        showAlert('Failed to load data. Please try again later.', 'danger');
    }
}

// Setup event listeners for forms and buttons
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
        createEventForm.addEventListener('submit', createEvent);
    }
    
    const generateQuestionsForm = document.getElementById('generate-questions-form');
    if (generateQuestionsForm) {
        generateQuestionsForm.addEventListener('submit', generateQuestions);
    }
    
    
    // Add event listener for generate deck button
    const generateDeckBtn = document.getElementById('generate-deck-btn');
        if (generateDeckBtn) {
            generateDeckBtn.addEventListener('click', generateDeck);
        }

    
    
    const saveQuestionsBtn = document.getElementById('save-questions-btn');
    if (saveQuestionsBtn) {
        saveQuestionsBtn.addEventListener('click', saveQuestions);
    }
    
    const loadFeedbackBtn = document.getElementById('load-feedback-btn');
    if (loadFeedbackBtn) {
        loadFeedbackBtn.addEventListener('click', loadFeedback);
    }
}

// Populate default categories and phases using plain string values
function initializeDefaultCategoriesAndPhases() {
    console.log('Initializing default categories and phases...');
    
    const defaultCategories = ['Icebreaker', 'Personal', 'Opinion', 'Hypothetical', 'Reflective', 'Cultural'];
    const defaultPhases = ['Warm-Up', 'Personal', 'Reflective', 'Challenge'];
    
    const categoryDropdown = document.getElementById('question-category');
    if (categoryDropdown) {
        populateDropdown(categoryDropdown, defaultCategories);
        console.log('Category dropdown populated with default values');
    } else {
        console.warn('Category dropdown element not found');
    }
    
    const phaseDropdown = document.getElementById('question-phase');
    if (phaseDropdown) {
        populateDropdown(phaseDropdown, defaultPhases);
        console.log('Phase dropdown populated with default values');
    } else {
        console.warn('Phase dropdown element not found');
    }
}

// Load categories and phases from API (if available)
async function loadCategoriesAndPhases() {
    try {
        console.log('Loading categories and phases from API...');
        
        // Categories
        const categoriesResponse = await fetch('/api/categories', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (categoriesResponse.ok) {
            const categories = await categoriesResponse.json();
            const categoryDropdown = document.getElementById('question-category');
            if (categoryDropdown) {
                populateDropdown(categoryDropdown, categories);
                console.log('Category dropdown populated from API');
            }
        } else {
            console.warn('Failed to load categories from API, using defaults');
        }
        
        // Phases
        const phasesResponse = await fetch('/api/phases', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (phasesResponse.ok) {
            const phases = await phasesResponse.json();
            const phaseDropdown = document.getElementById('question-phase');
            if (phaseDropdown) {
                populateDropdown(phaseDropdown, phases);
                console.log('Phase dropdown populated from API');
            }
        } else {
            console.warn('Failed to load phases from API, using defaults');
        }
    } catch (error) {
        console.error('Error loading categories and phases:', error);
        // Defaults are already in place.
    }
}

// Load locations (using API or fallback defaults)
async function loadLocations() {
    try {
        console.log('Loading locations...');
        
        const response = await fetch('/api/locations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const locations = await response.json();
            const locationSelects = document.querySelectorAll('#location-select');
            locationSelects.forEach(select => {
                // Assume locations is an array of objects with 'id' and 'name'
                populateDropdown(select, locations.map(loc => loc.name), locations.map(loc => loc.id));
            });
            console.log('Locations loaded successfully');
        } else {
            console.warn('Failed to load locations, using defaults');
            const defaultLocations = [
                { id: 'loc1', name: 'Üsküdar' },
                { id: 'loc2', name: 'Bahçeşehir' },
                { id: 'loc3', name: 'Bostancı' },
                { id: 'loc4', name: 'Kadıköy' },
                { id: 'loc5', name: 'Beşiktaş' },
                { id: 'loc6', name: 'Mecidiyeköy' }
            ];
            const locationSelects = document.querySelectorAll('#location-select');
            locationSelects.forEach(select => {
                populateDropdown(select, defaultLocations.map(loc => loc.name), defaultLocations.map(loc => loc.id));
            });
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        showAlert('Failed to load locations. Using default values.', 'warning');
    }
}

// Load events from the API
async function loadEvents() {
    try {
        console.log('Loading events...');
        
        const response = await fetch('/api/events', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load events');
        }
        
        const events = await response.json();
        const eventsList = document.getElementById('events-list');
        if (!eventsList) {
            console.warn('Events list element not found');
            return;
        }
        
        eventsList.innerHTML = '';
        if (events.length === 0) {
            eventsList.innerHTML = '<p>No events found. Create one below.</p>';
            return;
        }
        
        events.forEach(event => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.innerHTML = `
                <h3>${event.name}</h3>
                <p>${event.description}</p>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                <button class="select-event" data-id="${event.id}">Select</button>
            `;
            eventsList.appendChild(eventItem);
        });
        
        document.querySelectorAll('.select-event').forEach(button => {
            button.addEventListener('click', () => selectEvent(button.dataset.id));
        });
        
        const eventSelects = document.querySelectorAll('#event-select, #feedback-event-select, #deck-event-select');
        eventSelects.forEach(select => {
            if (select) {
                populateDropdown(select, events.map(e => e.name), events.map(e => e.id));
            }
        });
        
        console.log('Events loaded successfully');
    } catch (error) {
        console.error('Error loading events:', error);
        showAlert('Failed to load events. Please try again later.', 'danger');
    }
}

// Create a new event
async function createEvent(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('event-name');
    const descriptionInput = document.getElementById('event-description');
    const dateInput = document.getElementById('event-date');
    const locationSelect = document.getElementById('location-select');
    
    if (!nameInput || !descriptionInput || !dateInput || !locationSelect) {
        console.error('One or more form elements not found');
        showAlert('Form error: Missing elements', 'danger');
        return;
    }
    
    const name = nameInput.value;
    const description = descriptionInput.value;
    const date = dateInput.value;
    const locationId = locationSelect.value;
    
    if (!name || !description || !date || !locationId) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    try {
        console.log('Creating event...');
        
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                name,
                description,
                date,
                locationId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create event');
        }
        
        const event = await response.json();
        
        // Clear form
        const createEventForm = document.getElementById('create-event-form');
        if (createEventForm) {
            createEventForm.reset();
        }
        
        showAlert('Event created successfully', 'success');
        await loadEvents();
        selectEvent(event.id);
        
        console.log('Event created successfully:', event.name);
    } catch (error) {
        console.error('Error creating event:', error);
        showAlert('Failed to create event. Please try again later.', 'danger');
    }
}

// Select an event
async function selectEvent(eventId) {
    try {
        console.log('Selecting event:', eventId);
        currentEventId = eventId;
        
        const eventSelects = document.querySelectorAll('#event-select, #feedback-event-select');
        eventSelects.forEach(select => {
            if (select) {
                select.value = eventId;
            }
        });
        
        const questionsSection = document.getElementById('questions-section');
        
    } catch (error) {
        console.error('Error selecting event:', error);
        showAlert('Failed to select event. Please try again.', 'danger');
    }
}

// Generate questions for an event
async function generateQuestions(e) {
    e.preventDefault();
    console.log('Form submitted');
        const eventId = document.getElementById('event-select').value;
    const topic = document.getElementById('question-topic').value;
    const count = document.getElementById('question-count').value;
    const category = document.getElementById('question-category').value;
    const deckPhase = document.getElementById('question-phase').value;
    
    if (!eventId) {
        showAlert('Please select an event', 'danger');
        return;
    }
    
    if (!topic || !count || !category || !deckPhase) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    try {
        console.log('Form data:', { eventId, topic, count, category, deckPhase });

        console.log('Generating questions...');
        showAlert('Generating questions... This may take a moment.', 'info');
        
        const questionsSection = document.getElementById('questions-section');
        if (questionsSection) {
            questionsSection.style.display = 'block';
        }
        console.log('Sending request to /api/questions with data:', { eventId, topic, count, category, deckPhase });
        
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
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to generate questions');
        }
        console.log('Received response from /api/questions:', response);

        const data = await response.json();
        console.log('Response data:', data);
        currentQuestions = data.questions || [];
        displayGeneratedQuestions(currentQuestions);
        showAlert('Questions generated successfully', 'success');

        console.log('Questions generated successfully:', currentQuestions.length);
    } catch (error) {
        console.error('Error generating questions:', error);
        showAlert(`Error generating questions: ${error.message}`, 'danger');
    }
}

// Display generated questions in the questions section
function displayGeneratedQuestions(questions) {
    const generatedQuestionsDiv = document.getElementById('generated-questions');
    const saveQuestionsBtn = document.getElementById('save-questions-btn');
    
    if (!generatedQuestionsDiv) {
        console.warn('Generated questions div not found');
        return;
    }
    
    if (questions.length === 0) {
        generatedQuestionsDiv.innerHTML = '<p>No questions generated.</p>';
        if (saveQuestionsBtn) saveQuestionsBtn.style.display = 'none';
        return;
    }
    
    let html = '<h3>Generated Questions</h3><ul class="question-list">';
    
    questions.forEach(question => {
        const categoryText = typeof question.category === 'object'
            ? (question.category.name || JSON.stringify(question.category))
            : question.category;
        const phaseText = typeof question.deckPhase === 'object'
            ? (question.deckPhase.name || JSON.stringify(question.deckPhase))
            : question.deckPhase;
        html += `
            <li>
                <div class="question-text">${question.text}</div>
                <div class="question-meta">
                    <span class="category">Category: ${categoryText}</span>
                    <span class="phase">Phase: ${phaseText}</span>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    generatedQuestionsDiv.innerHTML = html;
    
    if (saveQuestionsBtn) {
        saveQuestionsBtn.style.display = 'block';
    }
}

// Save generated questions for an event
async function saveQuestions() {
    if (currentQuestions.length === 0) {
        showAlert('No questions to save', 'danger');
        return;
    }
    
    if (!currentEventId) {
        const eventSelect = document.getElementById('event-select');
        if (eventSelect) {
            currentEventId = eventSelect.value;
        }
        if (!currentEventId) {
            showAlert('Please select an event', 'danger');
            return;
        }
    }
    
    try {
        console.log('Saving questions...');
        
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                questions: currentQuestions,
                eventId: currentEventId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save questions');
        }
        
        const generatedQuestionsDiv = document.getElementById('generated-questions');
        if (generatedQuestionsDiv) {
            generatedQuestionsDiv.innerHTML = '';
        }
        
        const saveQuestionsBtn = document.getElementById('save-questions-btn');
        if (saveQuestionsBtn) {
            saveQuestionsBtn.style.display = 'none';
        }
        
        currentQuestions = [];
        showAlert('Questions saved successfully', 'success');
        
        console.log('Questions saved successfully');
    } catch (error) {
        console.error('Error saving questions:', error);
        showAlert('Failed to save questions. Please try again later.', 'danger');
    }
}

// Generate a question deck for an event and location
async function generateDeck(e) { 
    e.preventDefault();

    const eventSelect = document.getElementById('deck-event-select');
    const locationSelect = document.getElementById('deck-location-select');

    if (!eventSelect || !locationSelect) {
        console.error('One or more form elements not found');
        showAlert('Form error: Missing elements', 'danger');
        return;
    }

    const eventId = eventSelect.value;
    const locationId = locationSelect.value;

    if (!eventId || eventId === '') {
        showAlert('Please select an event', 'danger');
        return;
    }

    if (!locationId || locationId === '') {
        showAlert('Please select a location', 'danger');
        return;
    }
    
    console.log('Selected event ID:', eventId);
    console.log('Selected location ID:', locationId);
    
    try {
        console.log('Generating deck...');
        showAlert('Generating deck... This may take a moment.', 'info');
                
        const response = await fetch(`/api/decks/generate/${locationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                eventId
            })
        });
        
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        
        const deck = await response.json();
        displayDeckInfo(deck);
        showAlert('Deck generated successfully', 'success');
        console.log('Deck generated successfully:', deck.accessCode);
    } catch (error) {
        console.error('Error generating deck:', error);
        showAlert('Failed to generate deck', 'danger');
    } finally {
        console.log('Deck generation attempt complete.');
    }
}

// Display deck information
function displayDeckInfo(deck) {
    const deckInfoDiv = document.getElementById('deck-info');
    const qrContainer = document.getElementById('qr-container');
    
    if (!deckInfoDiv || !qrContainer) {
        console.warn('Deck info or QR container not found');
        return;
    }
    
    const html = `
        <h3>Deck Information</h3>
        <p><strong>Access Code:</strong> ${deck.accessCode}</p>
        <p><strong>Questions:</strong> ${deck.questions ? deck.questions.length : 0}</p>
        <p><strong>Created:</strong> ${new Date(deck.date).toLocaleString()}</p>
        <p>
            <strong>Participant Link:</strong> 
            <a href="/participant.html?code=${deck.accessCode}" target="_blank">
                ${window.location.origin}/participant.html?code=${deck.accessCode}
            </a>
        </p>
    `;
    
    deckInfoDiv.innerHTML = html;
    
    const participantUrl = `${window.location.origin}/participant.html?code=${deck.accessCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(participantUrl)}`;
    
    qrContainer.innerHTML = `
        <h3>QR Code</h3>
        <img src="${qrCodeUrl}" alt="QR Code" />
        <p>Scan this QR code to access the questions</p>
    `;
}

// Load feedback for a selected event
async function loadFeedback() {
    const feedbackEventSelect = document.getElementById('feedback-event-select');
    
    if (!feedbackEventSelect) {
        console.error('Feedback event select not found');
        return;
    }
    
    const eventId = feedbackEventSelect.value;
    
    if (!eventId) {
        showAlert('Please select an event', 'danger');
        return;
    }
    
    try {
        console.log('Loading feedback...');
        
        const questionsResponse = await fetch(`/api/questions/${eventId}`, {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        
        if (!questionsResponse.ok) {
            throw new Error('Failed to load questions');
        }
        
        const questions = await questionsResponse.json();
        
        if (questions.length === 0) {
            const feedbackContainer = document.getElementById('feedback-container');
            if (feedbackContainer) {
                feedbackContainer.innerHTML = '<p>No questions found for this event.</p>';
            }
            return;
        }
        
        displayFeedbackTable(questions);
        console.log('Feedback loaded successfully');
    } catch (error) {
        console.error('Error loading feedback:', error);
        showAlert('Failed to load feedback. Please try again later.', 'danger');
    }
}

// Display feedback in a table format
async function displayFeedbackTable(questions) {
    const feedbackContainer = document.getElementById('feedback-container');
    
    if (!feedbackContainer) {
        console.warn('Feedback container not found');
        return;
    }
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Question</th>
                <th>Category</th>
                <th>Phase</th>
                <th>Likes</th>
                <th>Dislikes</th>
                <th>Like Rate</th>
            </tr>
        </thead>
        <tbody id="feedback-table-body">
            <tr>
                <td colspan="6">Loading feedback data...</td>
            </tr>
        </tbody>
    `;
    
    feedbackContainer.innerHTML = '';
    feedbackContainer.appendChild(table);
    
    const tableBody = document.getElementById('feedback-table-body');
    tableBody.innerHTML = '';
    
    for (const question of questions) {
        try {
            const response = await fetch(`/api/feedback/stats/${question.id}`, {
                headers: {
                    'x-auth-token': localStorage.getItem('token')
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load feedback stats');
           }
            
            const stats = await response.json();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${question.text}</td>
                <td>${question.category || 'N/A'}</td>
                <td>${question.deckPhase || 'N/A'}</td>
                <td>${stats.likes || 0}</td>
                <td>${stats.dislikes || 0}</td>
                <td>${stats.likeRate ? (stats.likeRate * 100).toFixed(1) + '%' : 'N/A'}</td>
            `;
            
            tableBody.appendChild(row);
        } catch (error) {
            console.error(`Error getting feedback for question ${question.id}:`, error);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${question.text}</td>
                <td>${question.category || 'N/A'}</td>
                <td>${question.deckPhase || 'N/A'}</td>
                <td colspan="3">Error loading feedback data</td>
            `;
            tableBody.appendChild(row);
        }
    }
}

// Show an alert message
function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) {
        console.warn('Alert container not found');
        console.log(type + ' alert:', message);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}
