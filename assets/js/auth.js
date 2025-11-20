// assets/js/auth.js - ENHANCED VERSION WITH REDIRECT SUPPORT

// Check if user is logged in
function isLoggedIn() {
    return sessionStorage.getItem('isLoggedIn') === 'true';
}

// Enhanced login function with redirect support
function login(userData) {
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    // Handle redirect after login
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    
    let redirectUrl = '../index.html';
    
    switch (redirect) {
        case 'checkout':
            redirectUrl = '../checkout.html';
            break;
        case 'order-tracking':
            redirectUrl = '../order-tracking.html';
            break;
        case 'profile':
            redirectUrl = '../profile.html';
            break;
        // Add more redirect cases as needed
    }
    
    window.location.href = redirectUrl;
}

// LOGOUT FUNCTION
function logout() {
    console.log('Logout function called');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userData');
    window.location.href = 'auth/login.html';
}

// Initialize logout button - WAIT FOR HEADER TO LOAD
function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    console.log('Logout button found:', logoutBtn);
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout button clicked');
            logout();
        });
        console.log('Logout button initialized successfully');
    } else {
        console.log('No logout button found - will retry in 500ms');
        // Retry after a short delay in case header is still loading
        setTimeout(initLogout, 500);
    }
}

// Signup form
function initSignupForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        // Simple validation
        if (!firstName || !lastName || !email || !password || password !== confirmPassword || !terms) {
            alert('Please fill all fields correctly');
            return;
        }

        // Save user
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userData = { firstName, lastName, email, password, id: Date.now() };
        users.push(userData);
        localStorage.setItem('users', JSON.stringify(users));

        alert('Account created! Redirecting to login...');
        window.location.href = 'login.html';
    });
}

// Login form
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Check credentials
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            login(user);
            alert('Login successful!');
            // Note: The redirect is now handled in the login() function
        } else {
            alert('Invalid email or password');
        }
    });
}

// Enhanced auth guard with redirect support
function initAuthGuard() {
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('login.html') || currentPath.includes('signup.html');

    if (!isAuthPage && !isLoggedIn()) {
        // Store current page for redirect after login
        const currentPage = window.location.pathname.split('/').pop();
        window.location.href = `auth/login.html?redirect=${currentPage.replace('.html', '')}`;
        return;
    }

    if (isAuthPage && isLoggedIn()) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect');
        
        let redirectUrl = '../index.html';
        if (redirect) {
            redirectUrl = `../${redirect}.html`;
        }
        
        window.location.href = redirectUrl;
        return;
    }
}

// Wait for everything to load completely
window.addEventListener('load', function() {
    console.log('Window fully loaded - initializing auth');
    
    // Initialize components that exist on this page
    initLogout();
    initSignupForm();
    initLoginForm();
    
    // Only run auth guard if we're not on an auth page
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('login.html') || currentPath.includes('signup.html');
    
    if (!isAuthPage) {
        initAuthGuard();
    }
});

// Also try on DOMContentLoaded as backup
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing auth components');
    initSignupForm();
    initLoginForm();
});

// Make logout function available globally
window.logout = logout;