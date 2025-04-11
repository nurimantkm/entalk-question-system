// Authentication related functions
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on login or register page
    const isLoginPage = window.location.pathname.includes('login.html');
    const isRegisterPage = window.location.pathname.includes('register.html');
    
    if (isLoginPage || isRegisterPage) {
        // Redirect if already logged in
        redirectIfAuthenticated();
        
        // Set up form submission
        if (isLoginPage) {
            setupLoginForm();
        } else if (isRegisterPage) {
            setupRegisterForm();
        }
    }
});

// Setup login form
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            // Updated endpoint to match server.js
            const data = await apiRequest('/api/auth', 'POST', { email, password });
            
            // Save token to localStorage
            localStorage.setItem('token', data.token);
            
            // Show success message
            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect to events page
            setTimeout(() => {
                window.location.href = '/events.html';
            }, 1000);
        } catch (error) {
            showAlert(error.message || 'Login failed. Please check your credentials.');
        }
    });
}

// Setup register form
function setupRegisterForm() {
    const registerForm = document.getElementById('register-form');
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Check if passwords match
        if (password !== confirmPassword) {
            showAlert('Passwords do not match');
            return;
        }
        
        try {
            // Updated endpoint to match server.js
            const data = await apiRequest('/api/users', 'POST', { name, email, password });
            
            // Save token to localStorage
            localStorage.setItem('token', data.token);
            
            // Show success message
            showAlert('Registration successful! Redirecting...', 'success');
            
            // Redirect to events page
            setTimeout(() => {
                window.location.href = '/events.html';
            }, 1000);
        } catch (error) {
            showAlert(error.message || 'Registration failed. Please try again.');
        }
    });
}

// API request helper function
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

// Show alert function
function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
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

// Redirect if authenticated function
function redirectIfAuthenticated() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/events.html';
    }
}
