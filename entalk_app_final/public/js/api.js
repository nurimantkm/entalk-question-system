// API request helper function
async function apiRequest(endpoint, method, data) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: data ? JSON.stringify(data) : undefined
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.msg || responseData.error || 'Request failed');
        }
        
        return responseData;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Show alert function if not defined elsewhere
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

// Redirect if authenticated function if not defined elsewhere
function redirectIfAuthenticated() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/events.html';
    }
}
// API request helper function
async function apiRequest(endpoint, method, data) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: data ? JSON.stringify(data) : undefined
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.msg || responseData.error || 'Request failed');
        }
        
        return responseData;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Show alert function if not defined elsewhere
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

// Redirect if authenticated function if not defined elsewhere
function redirectIfAuthenticated() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/events.html';
    }
}
