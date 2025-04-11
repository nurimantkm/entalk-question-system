// participant.js - Enhanced with swipe interface for question feedback

// DOM Elements
const questionContainer = document.getElementById('question-container');
const loadingSpinner = document.getElementById('loading-spinner');
const noQuestionsMessage = document.getElementById('no-questions-message');
const completionMessage = document.getElementById('completion-message');
const progressCounter = document.getElementById('progress-counter');
const categoryLabel = document.getElementById('category-label');

// State
let currentQuestions = [];
let currentQuestionIndex = 0;
let eventId = '';
let locationId = '';
let deckId = '';

// Get access code from URL
const urlParams = new URLSearchParams(window.location.search);
const accessCode = urlParams.get('code');

// Initialize swipe detection
let touchStartX = 0;
let touchEndX = 0;

// Initialize the page
async function init() {
    if (!accessCode) {
        showError('No access code provided. Please scan the QR code again.');
        return;
    }

    try {
        showLoading(true);
        
        // Fetch the deck using the access code
        const response = await fetch(`/api/decks/${accessCode}`);
        
        if (!response.ok) {
            throw new Error('Failed to load questions');
        }
        
        const deck = await response.json();
        
        // Store deck info
        currentQuestions = deck.questions;
        eventId = deck.eventId;
        locationId = deck.locationId;
        deckId = deck.id;
        
        if (currentQuestions.length === 0) {
            showNoQuestions();
            return;
        }
        
        // Show the first question
        showQuestion(0);
        
        // Setup swipe listeners
        setupSwipeListeners();
        
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to load questions. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Setup swipe detection
function setupSwipeListeners() {
    const questionCard = document.querySelector('.question-card');
    
    if (!questionCard) return;
    
    // Touch events for mobile
    questionCard.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    questionCard.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    // Mouse events for desktop (for testing)
    let isDragging = false;
    let startX = 0;
    
    questionCard.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.clientX;
        questionCard.style.cursor = 'grabbing';
    });
    
    questionCard.addEventListener('mousemove', e => {
        if (!isDragging) return;
        
        const currentX = e.clientX;
        const diff = currentX - startX;
        
        // Limit the drag distance
        if (Math.abs(diff) > 150) return;
        
        // Move the card
        questionCard.style.transform = `translateX(${diff}px) rotate(${diff * 0.1}deg)`;
        
        // Change opacity based on direction
        if (diff > 0) {
            // Swiping right (like)
            questionCard.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            questionCard.style.borderColor = '#4CAF50';
        } else if (diff < 0) {
            // Swiping left (dislike)
            questionCard.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
            questionCard.style.borderColor = '#F44336';
        } else {
            // Reset
            questionCard.style.backgroundColor = 'white';
            questionCard.style.borderColor = '#ddd';
        }
    });
    
    questionCard.addEventListener('mouseup', e => {
        if (!isDragging) return;
        
        const endX = e.clientX;
        const diff = endX - startX;
        
        // Reset styles
        questionCard.style.cursor = 'grab';
        questionCard.style.backgroundColor = 'white';
        questionCard.style.borderColor = '#ddd';
        
        // If dragged far enough, count as swipe
        if (Math.abs(diff) > 100) {
            if (diff > 0) {
                handleLike();
            } else {
                handleDislike();
            }
        } else {
            // Reset position
            questionCard.style.transform = 'translateX(0) rotate(0)';
        }
        
        isDragging = false;
    });
    
    questionCard.addEventListener('mouseleave', e => {
        if (isDragging) {
            // Reset position and styles
            questionCard.style.transform = 'translateX(0) rotate(0)';
            questionCard.style.cursor = 'grab';
            questionCard.style.backgroundColor = 'white';
            questionCard.style.borderColor = '#ddd';
            isDragging = false;
        }
    });
    
    // Add button listeners
    document.getElementById('like-button').addEventListener('click', handleLike);
    document.getElementById('dislike-button').addEventListener('click', handleDislike);
}

// Handle swipe gesture
function handleSwipe() {
    const swipeThreshold = 100;
    const swipeDistance = touchEndX - touchStartX;
    
    if (swipeDistance > swipeThreshold) {
        // Swiped right (like)
        handleLike();
    } else if (swipeDistance < -swipeThreshold) {
        // Swiped left (dislike)
        handleDislike();
    }
}

// Handle like action
function handleLike() {
    const questionCard = document.querySelector('.question-card');
    
    // Animate card swiping right
    questionCard.style.transform = 'translateX(1000px) rotate(30deg)';
    questionCard.style.opacity = '0';
    
    // Record feedback
    recordFeedback('like');
    
    // Move to next question after animation
    setTimeout(() => {
        moveToNextQuestion();
    }, 300);
}

// Handle dislike action
function handleDislike() {
    const questionCard = document.querySelector('.question-card');
    
    // Animate card swiping left
    questionCard.style.transform = 'translateX(-1000px) rotate(-30deg)';
    questionCard.style.opacity = '0';
    
    // Record feedback
    recordFeedback('dislike');
    
    // Move to next question after animation
    setTimeout(() => {
        moveToNextQuestion();
    }, 300);
}

// Record feedback for the current question
async function recordFeedback(feedbackType) {
    try {
        const currentQuestion = currentQuestions[currentQuestionIndex];
        
        await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                questionId: currentQuestion.id,
                eventId: eventId,
                locationId: locationId,
                feedback: feedbackType
            })
        });
        
    } catch (error) {
        console.error('Error recording feedback:', error);
        // Continue anyway - don't block the user experience
    }
}

// Move to the next question
function moveToNextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion(currentQuestionIndex);
    } else {
        showCompletion();
    }
}

// Show the current question
function showQuestion(index) {
    const question = currentQuestions[index];
    
    // Update progress counter
    progressCounter.textContent = `${index + 1} / ${currentQuestions.length}`;
    
    // Update category label
    categoryLabel.textContent = question.category || '';
    
    // Create question card
    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';
    questionCard.innerHTML = `
        <div class="question-text">${question.text}</div>
        <div class="swipe-instruction">
            <div class="swipe-left">← Swipe left to dislike</div>
            <div class="swipe-right">Swipe right to like →</div>
        </div>
        <div class="button-container">
            <button id="dislike-button" class="action-button dislike">
                <i class="fas fa-times"></i>
            </button>
            <button id="like-button" class="action-button like">
                <i class="fas fa-heart"></i>
            </button>
        </div>
    `;
    
    // Clear previous question
    questionContainer.innerHTML = '';
    
    // Add new question
    questionContainer.appendChild(questionCard);
    
    // Show the container
    questionContainer.style.display = 'block';
    
    // Setup swipe listeners for the new card
    setupSwipeListeners();
}

// Show completion message
function showCompletion() {
    questionContainer.style.display = 'none';
    progressCounter.style.display = 'none';
    categoryLabel.style.display = 'none';
    completionMessage.style.display = 'block';
}

// Show no questions message
function showNoQuestions() {
    questionContainer.style.display = 'none';
    progressCounter.style.display = 'none';
    categoryLabel.style.display = 'none';
    noQuestionsMessage.style.display = 'block';
}

// Show error message
function showError(message) {
    noQuestionsMessage.textContent = message;
    showNoQuestions();
}

// Show/hide loading spinner
function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
