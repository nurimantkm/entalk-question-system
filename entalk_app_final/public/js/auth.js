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
