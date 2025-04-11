// App-wide functionality
document.addEventListener('DOMContentLoaded', function() {
    // Setup logout functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/';
        });
    }
    
    // Update navigation based on authentication status
    updateNavigation();
});

// Update navigation links based on authentication status
function updateNavigation() {
    const isLoggedIn = isAuthenticated();
    
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navLogout = document.getElementById('nav-logout');
    
    if (navLogin && navRegister && navLogout) {
        if (isLoggedIn) {
            navLogin.classList.add('d-none');
            navRegister.classList.add('d-none');
            navLogout.classList.remove('d-none');
        } else {
            navLogin.classList.remove('d-none');
            navRegister.classList.remove('d-none');
            navLogout.classList.add('d-none');
        }
    }
}
