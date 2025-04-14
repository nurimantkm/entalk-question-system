// Updated events.js with improved error handling and default categories/phases

document.addEventListener (function() {
    // Initialize the page
    init();
});

// Global variables
let currentEventId = '';
let currentQuestions = [];

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
        
        // Load locations
        await loadLocations();
        
        // Load events
        await loadEvents();
        
        // Load categories and phases for dropdowns
        await loadCategoriesAndPhases();
        
        console.log('Events page initialized successfully');
    } catch (error) {
        console.error('Error initializing page:', error);
        showAlert('Failed to load data. Please try again later.', 'danger');
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Create event form
    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
        createEventForm.addEventListener('submit', createEvent);
    }
    
    // Generate questions form
    const generateQuestionsForm = document.getElementById('generate-questions-form');
    if (generateQuestionsForm) {
        generateQuestionsForm.addEventListener('submit', generateQuestions);
    }
    
    // Generate deck form
    const generateDeckForm = document.getElementById('generate-deck-form');
    if (generateDeckForm) {
        generateDeckForm.addEventListener('submit', generateDeck);
    }
    
    // Save questions button
    const saveQuestionsBtn = document.getElementById('save-questions-btn');
    if (saveQuestionsBtn) {
        saveQuestionsBtn.addEventListener('click', saveQuestions);
    }
    
    // Load feedback button
    const loadFeedbackBtn = document.getElementById('load-feedback-btn');
    if (loadFeedbackBtn) {
        loadFeedbackBtn.addEventListener('click', loadFeedback);
    }
}

// Initialize default categories and phases
function initializeDefaultCategoriesAndPhases() {
    console.log('Initializing default categories and phases...');
    
    // Default categories
    const defaultCategories = [
        'Icebreaker',
        'Personal',
        'Opinion',
        'Hypothetical',
        'Reflective',
        'Cultural'
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
        console.log('Category dropdown populated with default values');
    } else {
        console.warn('Category dropdown element not found');
    }
    
    // Populate phase dropdown
    const phaseDropdown = document.getElementById('question-phase');
    if (phaseDropdown) {
        populateDropdown(phaseDropdown, defaultPhases);
        console.log('Phase dropdown populated with default values');
    } else {
        console.warn('Phase dropdown element not found');
    }
}

// Load question categories and deck phases
async function loadCategoriesAndPhases() {
    try {
        console.log('Loading categories and phases from API...');
        
        // Load categories
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
        
        // Load phases
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
        // Default values are already loaded, so we can continue
    }
}

// Load locations
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
            
            // Populate location dropdowns
            const locationSelects = document.querySelectorAll('#location-select');
            locationSelects.forEach(select => {
                populateDropdown(select, locations.map(loc => loc.name), locations.map(loc => loc.id));
            });
            
            console.log('Locations loaded successfully');
        } else {
            console.warn('Failed to load locations, using defaults');
            
            // Use default locations if API fails
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
                populateDropdown(
                    select, 
                    defaultLocations.map(loc => loc.name), 
                    defaultLocations.map(loc => loc.id)
                );
            });
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        showAlert('Failed to load locations. Using default values.', 'warning');
        
        // Use default locations if API fails
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
            populateDropdown(
                select, 
                defaultLocations.map(loc => loc.name), 
                defaultLocations.map(loc => loc.id)
            );
        });
    }
}

// Populate a dropdown with options
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
    
    // Add options
    options.forEach((option, index) => {
        const optionElement = document.createElement('option');
        optionElement.value = values ? values[index] : option;
        optionElement.textContent = option;
        selectElement.appendChild(optionElement);
    });
}

// Load events
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
        
        // Clear events list
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
        
        // Add events to list
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
        
        // Add event listeners to select buttons
        document.querySelectorAll('.select-event').forEach(button => {
            button.addEventListener('click', () => selectEvent(button.dataset.id));
        });
        
        // Populate event select dropdowns
        const eventSelects = document.querySelectorAll('#event-select, #feedback-event-select');
        eventSelects.forEach(select => {
            if (select) {
                populateDropdown(
                    select, 
                    events.map(e => e.name), 
                    events.map(e => e.id)
                );
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
        
        // Show success message
        showAlert('Event created successfully', 'success');
        
        // Reload events
        await loadEvents();
        
        // Select the new event
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
        
        // Update event select dropdowns
        const eventSelects = document.querySelectorAll('#event-select, #feedback-event-select');
        eventSelects.forEach(select => {
            if (select) {
                select.value = eventId;
            }
        });
        
        // Show questions and deck sections
        const questionsSection = document.getElementById('questions-section');
        const deckSection = document.getElementById('deck-section');
        
        if (questionsSection) {
            questionsSection.style.display = 'block';
        }
        
        if (deckSection) {
            deckSection.style.display = 'block';
        }
        
        console.log('Event selected successfully');
    } catch (error) {
        console.error('Error selecting event:', error);
        showAlert('Failed to select event. Please try again.', 'danger');
    }
}

// Fixed version of events.js with corrected question generation endpoint
// This fixes the 404 error when generating questions

async function generateQuestions() {
    const eventId = document.getElementById('event-select').value;
    const topicInput = document.getElementById('question-topic');
    const countInput = document.getElementById('question-count');
    const categorySelect = document.getElementById('question-category');
    const phaseSelect = document.getElementById('question-phase');
    
    const topic = topicInput.value;
    const count = countInput.value;
    const category = categorySelect.value;
    const deckPhase = phaseSelect.value;
    
    if (!eventId) {
        showAlert('Please select an event', 'danger');
        return;
    }
    
    if (!topic || !count || !category || !deckPhase) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    try {
        console.log('Generating questions...');
        showAlert('Generating questions... This may take a moment.', 'info');
        
        // FIXED: Changed endpoint from '/api/questions/generate' to '/api/questions'
        // to match the server implementation
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                eventId, // Added eventId to the request body
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
        
        const data = await response.json();
        
        // Store the generated questions
        currentQuestions = data.questions || [];
        
        // Display generated questions
        displayGeneratedQuestions(currentQuestions);
        
        // Show success message
        showAlert('Questions generated successfully', 'success');
        
        console.log('Questions generated successfully:', currentQuestions.length);
    } catch (error) {
        console.error('Error generating questions:', error);
        showAlert(`Error generating questions: ${error.message}`, 'danger');
    }
}

// Display generated questions
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
    
    // Create HTML for questions
    let html = '<h3>Generated Questions</h3><ul>';
    
    questions.forEach(question => {
        html += `
            <li>
                <div class="question-text">${question.text}</div>
                <div class="question-meta">
                    <span class="category">${question.category}</span>
                    <span class="phase">${question.deckPhase}</span>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    
    // Display questions
    generatedQuestionsDiv.innerHTML = html;
    
    // Show save button
    if (saveQuestionsBtn) {
        saveQuestionsBtn.style.display = 'block';
    }
}

// Save questions
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
        
        // Clear generated questions
        const generatedQuestionsDiv = document.getElementById('generated-questions');
        if (generatedQuestionsDiv) {
            generatedQuestionsDiv.innerHTML = '';
        }
        
        // Hide save button
        const saveQuestionsBtn = document.getElementById('save-questions-btn');
        if (saveQuestionsBtn) {
            saveQuestionsBtn.style.display = 'none';
        }
        
        // Reset current questions
        currentQuestions = [];
        
        // Show success message
        showAlert('Questions saved successfully', 'success');
        
        console.log('Questions saved successfully');
    } catch (error) {
        console.error('Error saving questions:', error);
        showAlert('Failed to save questions. Please try again later.', 'danger');
    }
}

// Generate a deck
async function generateDeck(e) {
    if (e) e.preventDefault();
    
    const eventSelect = document.getElementById('event-select');
    const locationSelect = document.getElementById('location-select');
    
    if (!eventSelect || !locationSelect) {
        console.error('One or more form elements not found');
        showAlert('Form error: Missing elements', 'danger');
        return;
    }
    
    const eventId = eventSelect.value;
    const locationId = locationSelect.value;
    
    if (!eventId) {
        showAlert('Please select an event', 'danger');
        return;
    }
    
    if (!locationId) {
        showAlert('Please select a location', 'danger');
        return;
    }
    
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
        
        if (!response.ok) {
            throw new Error('Failed to generate deck');
        }
        
        const deck = await response.json();
        
        // Display deck info
        displayDeckInfo(deck);
        
        // Show success message
        showAlert('Deck generated successfully', 'success');
        
        console.log('Deck generated successfully:', deck.accessCode);
    } catch (error) {
        console.error('Error generating deck:', error);
        showAlert('Failed to generate deck. Please try again later.', 'danger');
    }
}

// Display deck info
function displayDeckInfo(deck) {
    const deckInfoDiv = document.getElementById('deck-info');
    const qrContainer = document.getElementById('qr-container');
    
    if (!deckInfoDiv || !qrContainer) {
        console.warn('Deck info or QR container not found');
        return;
    }
    
    // Create HTML for deck info
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
    
    // Display deck info
    deckInfoDiv.innerHTML = html;
    
    // Generate QR code
    const participantUrl = `${window.location.origin}/participant.html?code=${deck.accessCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(participantUrl)}`;
    
    qrContainer.innerHTML = `
        <h3>QR Code</h3>
        <img src="${qrCodeUrl}" alt="QR Code" />
        <p>Scan this QR code to access the questions</p>
    `;
}

// Load feedback for an event
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
        
        // First, load questions for this event
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
        
        // Display feedback table
        displayFeedbackTable(questions);
        
        console.log('Feedback loaded successfully');
    } catch (error) {
        console.error('Error loading feedback:', error);
        showAlert('Failed to load feedback. Please try again later.', 'danger');
    }
}

// Display feedback table
async function displayFeedbackTable(questions) {
    const feedbackContainer = document.getElementById('feedback-container');
    
    if (!feedbackContainer) {
        console.warn('Feedback container not found');
        return;
    }
    
    // Create table
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
    
    // Load feedback stats for each question
    tableBody.innerHTML = '';
    
    for (const question of questions) {
        try {
            // Get feedback stats
            const response = await fetch(`/api/feedback/stats/${question.id}`, {
                headers: {
                    'x-auth-token': localStorage.getItem('token')
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load feedback stats');
            }
            
            const stats = await response.json();
            
            // Create table row
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
            
            // Add row with error message
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

// Show alert message
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
    
    // Clear previous alerts
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto-hide success and info alerts after 5 seconds
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
// Fix for category and deck phase display issues and question section visibility

// 1. Fix for the questions-section visibility
document.addEventListener('DOMContentLoaded', function() {
    // Make questions section visible by default
    const questionsSection = document.getElementById('questions-section');
    if (questionsSection) {
        questionsSection.style.display = 'block';
    }
});

// 2. Fix for category and deck phase display in dropdowns
function populateCategoryDropdown(categories) {
    const categoryDropdown = document.getElementById('question-category');
    if (!categoryDropdown) return;
    
    // Clear existing options
    categoryDropdown.innerHTML = '<option value="">-- Select --</option>';
    
    // Add categories with proper text display
    categories.forEach(category => {
        // Check if category is an object and has a name property
        const categoryName = category.name || (typeof category === 'string' ? category : JSON.stringify(category));
        const categoryValue = category.id || category;
        
        const option = document.createElement('option');
        option.value = categoryValue;
        option.textContent = categoryName;
        categoryDropdown.appendChild(option);
    });
    
    console.log('Category dropdown populated with proper text values');
}

function populatePhaseDropdown(phases) {
    const phaseDropdown = document.getElementById('question-phase');
    if (!phaseDropdown) return;
    
    // Clear existing options
    phaseDropdown.innerHTML = '<option value="">-- Select --</option>';
    
    // Add phases with proper text display
    phases.forEach(phase => {
        // Check if phase is an object and has a name property
        const phaseName = phase.name || (typeof phase === 'string' ? phase : JSON.stringify(phase));
        const phaseValue = phase.id || phase;
        
        const option = document.createElement('option');
        option.value = phaseValue;
        option.textContent = phaseName;
        phaseDropdown.appendChild(option);
    });
    
    console.log('Phase dropdown populated with proper text values');
}

// 3. Fix for displaying generated questions
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
    
    // Create HTML for questions
    let html = '<h3>Generated Questions</h3><ul class="question-list">';
    
    questions.forEach(question => {
        // Ensure category and phase are displayed properly
        const categoryText = typeof question.category === 'object' ? 
            (question.category.name || JSON.stringify(question.category)) : 
            question.category;
            
        const phaseText = typeof question.deckPhase === 'object' ? 
            (question.deckPhase.name || JSON.stringify(question.deckPhase)) : 
            question.deckPhase;
        
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
    
    // Display questions
    generatedQuestionsDiv.innerHTML = html;
    
    // Add some styling to the questions
    const style = document.createElement('style');
    style.textContent = `
        .question-list {
            list-style-type: none;
            padding: 0;
        }
        .question-list li {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 10px;
            background-color: #f9f9f9;
        }
        .question-text {
            font-size: 16px;
            margin-bottom: 8px;
        }
        .question-meta {
            font-size: 12px;
            color: #666;
            display: flex;
            justify-content: space-between;
        }
    `;
    document.head.appendChild(style);
    
    // Show save button
    if (saveQuestionsBtn) {
        saveQuestionsBtn.style.display = 'block';
    }
}

// 4. Fix for generating questions
async function generateQuestions() {
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
        console.log('Generating questions...');
        showAlert('Generating questions... This may take a moment.', 'info');
        
        // Make sure questions section is visible
        const questionsSection = document.getElementById('questions-section');
        if (questionsSection) {
            questionsSection.style.display = 'block';
        }
        
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
        
        const data = await response.json();
        
        // Store the generated questions
        currentQuestions = data.questions || [];
        
        // Display generated questions
        displayGeneratedQuestions(currentQuestions);
        
        // Show success message
        showAlert('Questions generated successfully', 'success');
        
        console.log('Questions generated successfully:', currentQuestions.length);
    } catch (error) {
        console.error('Error generating questions:', error);
        showAlert(`Error generating questions: ${error.message}`, 'danger');
    }
}
