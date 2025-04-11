// app.js - Common functionality across pages
document.addEventListener('DOMContentLoaded', function() {
    // Update navigation based on authentication status
    updateNavigation();
});

// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Update navigation based on authentication status
function updateNavigation() {
    const navLoginLink = document.getElementById('nav-login');
    const navRegisterLink = document.getElementById('nav-register');
    const navLogoutLink = document.getElementById('nav-logout');
    const navEventsLink = document.getElementById('nav-events');
    
    if (isAuthenticated()) {
        // User is logged in
        if (navLoginLink) navLoginLink.style.display = 'none';
        if (navRegisterLink) navRegisterLink.style.display = 'none';
        if (navLogoutLink) navLogoutLink.style.display = 'block';
        if (navEventsLink) navEventsLink.style.display = 'block';
    } else {
        // User is logged out
        if (navLoginLink) navLoginLink.style.display = 'block';
        if (navRegisterLink) navRegisterLink.style.display = 'block';
        if (navLogoutLink) navLogoutLink.style.display = 'none';
        if (navEventsLink) navEventsLink.style.display = 'none';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}
