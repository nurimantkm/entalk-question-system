// participant.js - Handles the participant interface for answering questions

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the participant page
    if (window.location.pathname.includes('participant.html')) {
        init();
    }
});

// Global variables
let currentQuestionIndex = 0;
let questions = [];
let accessCode = '';
let deckId = '';
let locationId = '';
let eventId = '';

// Initialize the page
async function init() {
    try {
        // Get access code from URL
        const urlParams = new URLSearchParams(window.location.search);
        accessCode = urlParams.get('code');
        
        if (!accessCode) {
            showMessage('No access code provided. Please scan the QR code again.', 'error');
            return;
        }
        
        // Load questions
        await loadQuestions();
        
        // Setup swipe functionality
        setupSwipe();
        
        // Setup button listeners
        setupButtons();
    } catch (error) {
        console.error('Error initializing page:', error);
        showMessage('Error loading questions. Please try again.', 'error');
    }
}

// Load questions using the access code
async function loadQuestions() {
    try {
        console.log("Loading questions with access code:", accessCode);
        const deckRes = await fetch(`/api/decks/${accessCode}`);
        const deckData = await deckRes.json();

        if (!deckRes.ok) {
            throw new Error(deckData.error || 'Failed to load questions');
        }

        console.log("Received deck data:", deckData);
        questions = deckData.questions || [];
        deckId = deckData.id;
        eventId = deckData.eventId;

        // Fetch event details to get locationId
        try {
            const eventRes = await fetch(`/api/events/${eventId}`);
            const eventData = await eventRes.json();
            if (eventRes.ok && eventData.locationId) {
                locationId = eventData.locationId;
                console.log('Resolved locationId from event:', locationId);
            } else {
                console.warn('Could not fetch locationId from event');
            }
        } catch (err) {
            console.warn('Error fetching event details for locationId:', err);
        }

        if (questions.length === 0) {
            showMessage('No questions available for this event.', 'error');
            return;
        }

        // Display first question
        displayQuestion(0);

        // Update progress
        updateProgress();
    } catch (error) {
        console.error('Error loading questions:', error);
        showMessage('Error loading questions. Please try again.', 'error');
    }
}

// Display a question
function displayQuestion(index) {
    if (index >= questions.length) {
        // All questions answered
        showCompletion();
        return;
    }
    
    const question = questions[index];
    console.log("Displaying question:", question); // Debug log
    
    const questionElement = document.getElementById('question-text');
    const categoryElement = document.getElementById('question-category');
    
    if (questionElement) {
        questionElement.textContent = question.text || "AI generated question";
    }
    if (categoryElement) {
        categoryElement.textContent = question.category || '';
    }
    
    // Update current index
    currentQuestionIndex = index;
    
    // Update progress
    updateProgress();
}

// Setup swipe functionality
function setupSwipe() {
    /* existing swipe code unchanged */
}

// Reset card position after swipe
function resetCardPosition() {
    /* unchanged */
}

// Setup button listeners
function setupButtons() {
    const likeButton = document.getElementById('like-button');
    const dislikeButton = document.getElementById('dislike-button');
    
    if (likeButton) {
        likeButton.addEventListener('click', function() {
            handleFeedback(true);
        });
    }
    if (dislikeButton) {
        dislikeButton.addEventListener('click', function() {
            handleFeedback(false);
        });
    }
}

// Handle feedback (like/dislike)
async function handleFeedback(isLike) {
    try {
        if (currentQuestionIndex >= questions.length) return;
        const question = questions[currentQuestionIndex];
        console.log("Recording feedback for question:", question, "isLike:", isLike);
        
        // Record feedback
        await recordFeedback(question, isLike);
        
        // Animate card off screen
        const questionCard = document.getElementById('question-card');
        if (questionCard) {
            questionCard.style.transform = isLike
                ? 'translateX(1000px) rotate(45deg)'
                : 'translateX(-1000px) rotate(-45deg)';
        }
        
        // Move to next question after animation
        setTimeout(() => {
            displayQuestion(currentQuestionIndex + 1);
            resetCardPosition();
        }, 300);
    } catch (error) {
        console.error('Error handling feedback:', error);
        showMessage('Error recording feedback. Please try again.', 'error');
    }
}

// Update progress indicator
function updateProgress() {
    const progressElement = document.getElementById('progress');
    if (progressElement && questions.length > 0) {
        progressElement.textContent = `${currentQuestionIndex + 1}/${questions.length}`;
    }
}

// Show completion message
function showCompletion() {
    const questionContainer = document.getElementById('question-container');
    if (questionContainer) {
        questionContainer.innerHTML = `
            <div class="completion-message">
                <h2>All Done!</h2>
                <p>You've answered all the questions.</p>
                <p>Thank you for participating!</p>
            </div>
        `;
    }
}

// Show message to user
function showMessage(message, type = 'error') {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = type;
        messageElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }
}

// Record feedback to server
async function recordFeedback(question, isLike) {
    const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            questionId: question.id,
            deckId,
            locationId,
            eventId,
            isLike,
            timestamp: new Date().toISOString()
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to record feedback');
    }
}
