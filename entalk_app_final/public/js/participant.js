// participant.js - Handles the participant interface for answering questions
const { v4: uuidv4 } = require('uuid');

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
        const response = await fetch(`/api/decks/${accessCode}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.msg || 'Failed to load questions');
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
        // Make sure we have text to display
        questionElement.textContent = question.text || "AI generated question";
    } else {
        console.error("Question text element not found");
    }
    
    if (categoryElement) {
        categoryElement.textContent = question.category || '';
    } else {
        console.error("Category element not found");
    }
    
    // Update current index
    currentQuestionIndex = index;
    
    // Update progress
    updateProgress();
}

// Setup swipe functionality
function setupSwipe() {
    const questionCard = document.getElementById('question-card');
    if (!questionCard) {
        console.error("Question card element not found");
        return;
    }
    
    let startX, startY, moveX, moveY;
    let threshold = 100; // Minimum distance to be considered a swipe
    
    questionCard.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });
    
    questionCard.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;
        
        moveX = e.touches[0].clientX;
        moveY = e.touches[0].clientY;
        
        const diffX = moveX - startX;
        
        // Apply rotation and movement based on swipe
        questionCard.style.transform = `translateX(${diffX}px) rotate(${diffX * 0.1}deg)`;
        
        // Change background color based on swipe direction
        if (diffX > 0) {
            questionCard.style.backgroundColor = 'rgba(76, 175, 80, 0.1)'; // Green for like
        } else if (diffX < 0) {
            questionCard.style.backgroundColor = 'rgba(244, 67, 54, 0.1)'; // Red for dislike
        } else {
            questionCard.style.backgroundColor = 'white';
        }
    });
    
    questionCard.addEventListener('touchend', function(e) {
        if (!startX || !startY || !moveX || !moveY) {
            resetCardPosition();
            return;
        }
        
        const diffX = moveX - startX;
        
        if (Math.abs(diffX) > threshold) {
            // Swipe was long enough
            if (diffX > 0) {
                // Swipe right (like)
                handleFeedback(true);
            } else {
                // Swipe left (dislike)
                handleFeedback(false);
            }
        } else {
            // Swipe was too short, reset position
            resetCardPosition();
        }
        
        // Reset values
        startX = null;
        startY = null;
        moveX = null;
        moveY = null;
    });
    
    // For desktop/mouse users
    let isDragging = false;
    
    questionCard.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging || !startX || !startY) return;
        
        moveX = e.clientX;
        moveY = e.clientY;
        
        const diffX = moveX - startX;
        
        // Apply rotation and movement based on swipe
        questionCard.style.transform = `translateX(${diffX}px) rotate(${diffX * 0.1}deg)`;
        
        // Change background color based on swipe direction
        if (diffX > 0) {
            questionCard.style.backgroundColor = 'rgba(76, 175, 80, 0.1)'; // Green for like
        } else if (diffX < 0) {
            questionCard.style.backgroundColor = 'rgba(244, 67, 54, 0.1)'; // Red for dislike
        } else {
            questionCard.style.backgroundColor = 'white';
        }
    });
    
    document.addEventListener('mouseup', function(e) {
        if (!isDragging) return;
        
        if (!startX || !startY || !moveX || !moveY) {
            resetCardPosition();
            isDragging = false;
            return;
        }
        
        const diffX = moveX - startX;
        
        if (Math.abs(diffX) > threshold) {
            // Swipe was long enough
            if (diffX > 0) {
                // Swipe right (like)
                handleFeedback(true);
            } else {
                // Swipe left (dislike)
                handleFeedback(false);
            }
        } else {
            // Swipe was too short, reset position
            resetCardPosition();
        }
        
        // Reset values
        isDragging = false;
        startX = null;
        startY = null;
        moveX = null;
        moveY = null;
    });
}

// Function to get or create a userId
function getOrCreateUserId() {
    let userId = localStorage.getItem('participantId');
    if (!userId) {
        userId = uuidv4();
        localStorage.setItem('participantId', userId);
        isDragging = false;
        startX = null;
        startY = null;
        moveX = null;
        moveY = null;
    });
}

// Reset card position after swipe
function resetCardPosition() {
    const questionCard = document.getElementById('question-card');
    if (!questionCard) return;
    
    questionCard.style.transform = 'translateX(0) rotate(0)';
    questionCard.style.backgroundColor = 'white';
}

// Setup button listeners
function setupButtons() {
    const likeButton = document.getElementById('like-button');
    const dislikeButton = document.getElementById('dislike-button');
    
    if (likeButton) {
        likeButton.addEventListener('click', function() {
            handleFeedback(true);
        });
    } else {
        console.error("Like button not found");
    }
    
    if (dislikeButton) {
        dislikeButton.addEventListener('click', function() {
            handleFeedback(false);
        });
    } else {
        console.error("Dislike button not found");
    }
}

// Handle feedback (like/dislike)
async function handleFeedback(isLike) {
    try {
        if (currentQuestionIndex >= questions.length) {
            console.error("Invalid question index:", currentQuestionIndex);
            return;
        }
        
        const question = questions[currentQuestionIndex];
        console.log("Recording feedback for question:", question, "isLike:", isLike);
        
        // Record feedback
        await recordFeedback(question.id, isLike);
        
        // Animate card off screen
        const questionCard = document.getElementById('question-card');
        if (questionCard) {
            questionCard.style.transform = `translateX(${isLike ? 1000 : -1000}px) rotate(${isLike ? 45 : -45}deg)`;
            
            // Wait for animation to complete
            setTimeout(() => {
                // Move to next question
                displayQuestion(currentQuestionIndex + 1);
                
                // Reset card position
                resetCardPosition();
            }, 300);
        } else {
            // No card element, just move to next question
            displayQuestion(currentQuestionIndex + 1);
        }
    } catch (error) {
        console.error('Error handling feedback:', error);
        showMessage('Error saving your response. Please try again.', 'error');
    }
}

// Record feedback to server
async function recordFeedback(questionId, isLike) {
    try {
        console.log("Sending feedback to server:", {
            questionId,
            eventId,
            locationId,
            userId: getOrCreateUserId(),
            feedback: isLike ? 'like' : 'dislike'
        });
        
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questionId,
                eventId,
                userId: getOrCreateUserId(),
                locationId,
                feedback: isLike ? 'like' : 'dislike'
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.msg || 'Failed to record feedback');
        }
        
        console.log("Feedback recorded successfully:", data);
        return data;
    } catch (error) {
        console.error('Error recording feedback:', error);
        // Continue anyway to not block the user experience
    }
}

// Update progress indicator
function updateProgress() {
    const progressElement = document.getElementById('progress');
    if (!progressElement) {
        console.error("Progress element not found");
        return;
    }
    
    const progress = Math.round((currentQuestionIndex / questions.length) * 100);
    progressElement.style.width = `${progress}%`;
    
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    } else {
        console.error("Progress text element not found");
    }
}

// Show completion message
function showCompletion() {
    const questionContainer = document.getElementById('question-container');
    const completionContainer = document.getElementById('completion-container');
    
    if (questionContainer) {
        questionContainer.style.display = 'none';
    } else {
        console.error("Question container not found");
    }
    
    if (completionContainer) {
        completionContainer.style.display = 'block';
    } else {
        console.error("Completion container not found");
    }
}

// Show message to user
function showMessage(message, type = 'error') {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        console.error("Message container not found");
        return;
    }
    
    messageContainer.textContent = message;
    messageContainer.className = `message ${type}`;
    messageContainer.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}
