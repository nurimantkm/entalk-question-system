// events.js - Enhanced with QR code generation and deck management

// DOM Elements
const eventForm = document.getElementById('event-form');
const eventsList = document.getElementById('events-list');
const questionForm = document.getElementById('question-form');
const questionsList = document.getElementById('questions-list');
const generateQuestionsBtn = document.getElementById('generate-questions');
const topicInput = document.getElementById('topic');
const countInput = document.getElementById('count');
const categorySelect = document.getElementById('category');
const deckPhaseSelect = document.getElementById('deck-phase');
const locationSelect = document.getElementById('location');
const generateDeckBtn = document.getElementById('generate-deck');
const decksContainer = document.getElementById('decks-container');
const qrCodeContainer = document.getElementById('qr-code-container');

// State
let currentEventId = '';
let currentEvent = null;
let currentQuestions = [];
let locations = [];

// Initialize the page
async function init() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        // Load categories and phases for dropdowns
        await loadCategoriesAndPhases();
        
        // Load locations
        await loadLocations();
        
        // Load events
        await loadEvents();
        
        // Add event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showAlert('Failed to load data. Please try again later.', 'danger');
    }
}

// Load question categories and deck phases
async function loadCategoriesAndPhases() {
    try {
        // Load categories
        const categoriesResponse = await fetch('/api/questions/categories', {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        
        if (categoriesResponse.ok) {
            const categories = await categoriesResponse.json();
            populateDropdown(categorySelect, categories);
        }
        
        // Load phases
        const phasesResponse = await fetch('/api/questions/phases', {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        
        if (phasesResponse.ok) {
            const phases = await phasesResponse.json();
            populateDropdown(deckPhaseSelect, phases);
        }
    } catch (error) {
        console.error('Error loading categories and phases:', error);
    }
}

// Load locations
async function loadLocations() {
    try {
        const response = await fetch('/api/locations', {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        
        if (response.ok) {
            locations = await response.json();
            populateDropdown(locationSelect, locations.map(loc => loc.name), locations.map(loc => loc.id));
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// Populate a dropdown with options
function populateDropdown(selectElement, options, values = null) {
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

// Setup event listeners
function setupEventListeners() {
    // Event form submission
    eventForm.addEventListener('submit', createEvent);
    
    // Question form submission
    questionForm.addEventListener('submit', saveQuestions);
    
    // Generate questions button
    generateQuestionsBtn.addEventListener('click', generateQuestions);
    
    // Generate deck button
    generateDeckBtn.addEventListener('click', generateDeck);
}

// Load events
async function loadEvents() {
    try {
        const response = await fetch('/api/events', {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load events');
        }
        
        const events = await response.json();
        
        // Clear events list
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
                <button class="btn btn-primary select-event" data-id="${event.id}">Select</button>
            `;
            eventsList.appendChild(eventItem);
        });
        
        // Add event listeners to select buttons
        document.querySelectorAll('.select-event').forEach(button => {
            button.addEventListener('click', () => selectEvent(button.dataset.id));
        });
        
    } catch (error) {
        console.error('Error loading events:', error);
        showAlert('Failed to load events. Please try again later.', 'danger');
    }
}

// Create a new event
async function createEvent(e) {
    e.preventDefault();
    
    const name = document.getElementById('event-name').value;
    const description = document.getElementById('event-description').value;
    const date = document.getElementById('event-date').value;
    const locationId = locationSelect.value;
    
    if (!name || !description || !date) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
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
        eventForm.reset();
        
        // Show success message
        showAlert('Event created successfully', 'success');
        
        // Reload events
        await loadEvents();
        
        // Select the new event
        selectEvent(event.id);
        
    } catch (error) {
        console.error('Error creating event:', error);
        showAlert('Failed to create event. Please try again later.', 'danger');
    }
}

// Select an event
async function selectEvent(eventId) {
    try {
        currentEventId = eventId;
        
        // Fetch event details
        const eventResponse = await fetch(`/api/events/${eventId}`, {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        
        if (!eventResponse.ok) {
            throw new Error('Failed to load event details');
        }
        
        currentEvent = await eventResponse.json();
        
        // Show event details
        document.getElementById('selected-event').textContent = currentEvent.name;
        document.getElementById('event-details').style.display = 'block';
        
        // Load questions for this event
        await loadQuestions(eventId);
        
        // Load decks for this event
        await loadDecks(eventId);
        
    } catch (error) {
        console.error('Error selecting event:', error);
        showAlert('Failed to load event details. Please try again later.', 'danger');
    }
}

// Load questions for an event
async function loadQuestions(eventId) {
    try {
        const response = await fetch(`/api/questions/${eventId}`, {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load questions');
        }
        
        currentQuestions = await response.json();
        
        // Clear questions list
        questionsList.innerHTML = '';
        
        if (currentQuestions.length === 0) {
            questionsList.innerHTML = '<p>No questions found. Generate or create some below.</p>';
            return;
        }
        
        // Group questions by category
        const questionsByCategory = {};
        
        currentQuestions.forEach(question => {
            if (!questionsByCategory[question.category]) {
                questionsByCategory[question.category] = [];
            }
            questionsByCategory[question.category].push(question);
        });
        
        // Add questions to list, grouped by category
        Object.keys(questionsByCategory).forEach(category => {
            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = category;
            questionsList.appendChild(categoryHeader);
            
            const questionItems = document.createElement('ul');
            questionItems.className = 'question-items';
            
            questionsByCategory[category].forEach(question => {
                const questionItem = document.createElement('li');
                questionItem.className = 'question-item';
                
                // Add performance indicators if available
                let performanceHtml = '';
                if (question.performance && question.performance.views > 0) {
                    const likeRate = question.performance.likes / question.performance.views;
                    const likePercentage = Math.round(likeRate * 100);
                    
                    performanceHtml = `
                        <div class="question-stats">
                            <span class="views" title="Views"><i class="fas fa-eye"></i> ${question.performance.views}</span>
                            <span class="likes" title="Likes"><i class="fas fa-heart"></i> ${question.performance.likes}</span>
                            <span class="like-rate ${likePercentage >= 70 ? 'high' : likePercentage >= 40 ? 'medium' : 'low'}" 
                                  title="Like rate">
                                ${likePercentage}%
                            </span>
                        </div>
                    `;
                }
                
                questionItem.innerHTML = `
                    <div class="question-text">${question.text}</div>
                    <div class="question-meta">
                        <span class="phase">${question.deckPhase || 'N/A'}</span>
                        ${question.isNovelty ? '<span class="novelty">Novelty</span>' : ''}
                    </div>
                    ${performanceHtml}
                `;
                
                questionItems.appendChild(questionItem);
            });
            
            questionsList.appendChild(questionItems);
        });
        
        // Show questions section
        document.getElementById('questions-section').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading questions:', error);
        showAlert('Failed to load questions. Please try again later.', 'danger');
    }
}

// Generate questions
async function generateQuestions() {
    const topic = topicInput.value;
    const count = countInput.value;
    const category = categorySelect.value;
    const deckPhase = deckPhaseSelect.value;
    
    if (!topic || !count || !category || !deckPhase) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/questions/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify({
                topic,
                count: parseInt(count),
                category,
                deckPhase
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate questions');
        }
        
        const data = await response.json();
        
        // Display generated questions in the textarea
        document.getElementById('questions-text').value = data.questions.map(q => q.text).join('\n');
        
        // Store the full question objects
        document.getElementById('questions-text').dataset.questions = JSON.stringify(data.questions);
        
        // Show success message
        showAlert('Questions generated successfully', 'success');
        
    } catch (error) {
        console.error('Error generating questions:', error);
        showAlert('Failed to generate questions. Please try again later.', 'danger');
    }
}

// Save questions
async function saveQuestions(e) {
    e.preventDefault();
    
    if (!currentEventId) {
        showAlert('Please select an event first', 'danger');
        return;
    }
    
    const questionsText = document.getElementById('questions-text').value;
    
    if (!questionsText) {
        showAlert('Please enter or generate some questions', 'danger');
        return;
    }
    
    try {
        // Check if we have structured question data from generation
        let questions = [];
        const storedQuestions = document.getElementById('questions-text').dataset.questions;
        
        if (storedQuestions) {
            // Use the structured data if available
            questions = JSON.parse(storedQuestions);
        } else {
            // Otherwise, parse from text and use default category/phase
            const category = categorySelect.value || 'Opinion';
            const deckPhase = deckPhaseSelect.value || 'Reflective';
            
            questions = questionsText.split('\n')
                .filter(text => text.trim())
                .map(text => ({
                    text: text.trim(),
                    category,
                    deckPhase
                }));
        }
        
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify({
                questions,
                eventId: currentEventId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save questions');
        }
        
        // Clear form
        questionForm.reset();
        document.getElementById('questions-text').dataset.questions = '';
        
        // Show success message
        showAlert('Questions saved successfully', 'success');
        
        // Reload questions
        await loadQuestions(currentEventId);
        
    } catch (error) {
        console.error('Error saving questions:', error);
        showAlert('Failed to save questions. Please try again later.', 'danger');
    }
}

// Generate a deck for a location
async function generateDeck() {
    if (!currentEventId) {
        showAlert('Please select an event first', 'danger');
        return;
    }
    
    const locationId = locationSelect.value;
    
    if (!locationId) {
        showAlert('Please select a location', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`/api/decks/generate/${locationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token')
            },
            body: JSON.stringify({
                eventId: currentEventId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate deck');
        }
        
        const deck = await response.json();
        
        // Show success message
        showAlert('Deck generated successfully', 'success');
        
        // Reload decks
        await loadDecks(currentEventId);
        
    } catch (error) {
        console.error('Error generating deck:', error);
        showAlert('Failed to generate deck. Please try again later.', 'danger');
    }
}

// Load decks for an event
async function loadDecks(eventId) {
    try {
        // For now, we'll just get all decks and filter client-side
        // In a real implementation, we'd have an API endpoint to get decks by event
        const decks = global.questionDecks.filter(deck => deck.eventId === eventId);
        
        // Clear decks container
        decksContainer.innerHTML = '';
        
        if (decks.length === 0) {
            decksContainer.innerHTML = '<p>No decks found. Generate one above.</p>';
            return;
        }
        
        // Group decks by location
        const decksByLocation = {};
        
        decks.forEach(deck => {
            if (!decksByLocation[deck.locationId]) {
                decksByLocation[deck.locationId] = [];
            }
            decksByLocation[deck.locationId].push(deck);
        });
        
        // Add decks to container, grouped by location
        Object.keys(decksByLocation).forEach(locationId => {
            const location = locations.find(loc => loc.id === locationId);
            const locationName = location ? location.name : 'Unknown Location';
            
            const locationHeader = document.createElement('h4');
            locationHeader.textContent = locationName;
            decksContainer.appendChild(locationHeader);
            
            // Sort decks by date (newest first)
            const sortedDecks = decksByLocation[locationId].sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );
            
            // Take only the most recent deck
            const latestDeck = sortedDecks[0];
            
            const deckItem = document.createElement('div');
            deckItem.className = 'deck-item';
            deckItem.innerHTML = `
                <div class="deck-info">
                    <p><strong>Created:</strong> ${new Date(latestDeck.date).toLocaleString()}</p>
                    <p><strong>Questions:</strong> ${latestDeck.questions.length}</p>
                    <p><strong>Access Code:</strong> ${latestDeck.accessCode}</p>
                </div>
                <div class="deck-actions">
                    <button class="btn btn-primary show-qr" data-code="${latestDeck.accessCode}">
                        Show QR Code
                    </button>
                </div>
            `;
            
            decksContainer.appendChild(deckItem);
        });
        
        // Add event listeners to QR code buttons
        document.querySelectorAll('.show-qr').forEach(button => {
            button.addEventListener('click', () => showQRCode(button.dataset.code));
        });
        
        // Show decks section
        document.getElementById('decks-section').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading decks:', error);
        showAlert('Failed to load decks. Please try again later.', 'danger');
    }
}

// Show QR code for a deck
function showQRCode(accessCode) {
    // Clear QR code container
    qrCodeContainer.innerHTML = '';
    
    // Create QR code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/participant.html?code=' + accessCode)}`;
    
    const qrCode = document.createElement('div');
    qrCode.className = 'qr-code';
    qrCode.innerHTML = `
        <h3>QR Code for Access Code: ${accessCode}</h3>
        <img src="${qrCodeUrl}" alt="QR Code">
        <p>Scan this code to access the questions</p>
        <p>Or share this link: <a href="${window.location.origin}/participant.html?code=${accessCode}" target="_blank">${window.location.origin}/participant.html?code=${accessCode}</a></p>
    `;
    
    qrCodeContainer.appendChild(qrCode);
    qrCodeContainer.style.display = 'block';
}

// Show alert message
function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    // Remove alert after 3 seconds
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
