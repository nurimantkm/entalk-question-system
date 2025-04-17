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
}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load questions');
        }
        
        console.log("Received data:", data);
        questions = data.questions || [];
        deckId = data.id;
        locationId = data.locationId;
        eventId = data.eventId;
        
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

// Setup swipe functionality (unchanged)...
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
            questionCard.style.transform = `translateX(${isLike ? 1000 : -1000}px) rotate(${isLike ? 45 : -45}deg)`;
            setTimeout(() => {
                displayQuestion(currentQuestionIndex + 1);
                resetCardPosition();
            }, 300);
        } else {
            displayQuestion(currentQuestionIndex + 1);
        }
    } catch (error) {
        console.error('Error handling feedback:', error);
        showMessage('Error saving your response. Please try again.', 'error');
    }
}

// Record feedback to server and fetch updated stats
async function recordFeedback(question, isLike) {
    try {
        const payload = {
            questionId: question._id || question.id,
            eventId,
            locationId,
            feedbackType: isLike ? 'like' : 'dislike'
        };
        console.log('Sending feedback to server:', payload);
        
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to record feedback');
        }
        console.log('Feedback recorded successfully:', data);
        
        // Fetch updated stats for this question
        const statsRes = await fetch(`/api/feedback/stats/${payload.questionId}`);
        if (statsRes.ok) {
            const stats = await statsRes.json();
            console.log('Updated stats for question:', stats);
            // TODO: update UI with new stats if desired
        }
    } catch (error) {
        console.error('Error recording feedback:', error);
        showMessage('Could not record feedback: ' + error.message, 'error');
    }
}

// Update progress indicator
function updateProgress() {
    /* unchanged */
}

// Show completion message
function showCompletion() {
    /* unchanged */
}

// Show message to user
function showMessage(message, type = 'error') {
    /* unchanged */
}
