// assets/js/auth.js - Fixed version
const API_BASE_URL = 'http://localhost/farmconnect/api';

// Common utility functions
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function clearErrors() {
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(error => {
        error.textContent = '';
        error.style.display = 'none';
    });
}

function showSuccessMessage(message) {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        successMessage.className = 'success-message show';
        
        setTimeout(() => {
            successMessage.style.display = 'none';
            successMessage.className = 'success-message';
        }, 3000);
    }
}

// Session management
function setSession(user, token) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('session_token', token);
}

function getSession() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('session_token');
    return user && token ? { user: JSON.parse(user), token } : null;
}

function clearSession() {
    localStorage.removeItem('user');
    localStorage.removeItem('session_token');
}

// Check if user is logged in
function checkAuth() {
    return getSession() !== null;
}

// API Helper Functions
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API Request:', url, method, data); // Debug log
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Add authorization header if logged in
    const session = getSession();
    if (session) {
        options.headers['Authorization'] = `Bearer ${session.token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        
        // Check if response is HTML instead of JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // Get response as text to see what's returned
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            throw new Error('Server returned non-JSON response. Check API endpoint.');
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `Server error: ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Login Functionality
async function handleLogin(email, password) {
    try {
        const data = await apiRequest('/auth.php?action=login', 'POST', {
            email: email,
            password: password
        });

        if (data.success) {
            setSession(data.user, data.session_token);
            showSuccessMessage('Login successful! Redirecting...');
            
            // Update header for logged-in user
            updateHeaderForLoggedInUser(data.user);
            
            // Redirect based on user type
            setTimeout(() => {
                if (data.user.user_type === 'farm_owner') {
                    window.location.href = 'owner/index.html';
                } else if (data.user.user_type === 'admin') {
                    window.location.href = 'admin/index.html';
                } else {
                    window.location.href = '../index.html';
                }
            }, 1500);
        }
    } catch (error) {
        showError('emailError', error.message);
        showError('passwordError', error.message);
    }
}

// Registration Functionality
async function handleRegistration(formData) {
    try {
        const data = await apiRequest('/auth.php?action=register', 'POST', formData);

        if (data.success) {
            setSession(data.user, data.session_token);
            showSuccessMessage('Registration successful! Welcome to FarmConnect.');
            
            // Update header for logged-in user
            updateHeaderForLoggedInUser(data.user);
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        }
    } catch (error) {
        // Show appropriate error based on field
        if (error.message.includes('Email')) {
            showError('emailError', error.message);
        } else if (error.message.includes('Password')) {
            showError('passwordError', error.message);
        } else if (error.message.includes('terms')) {
            showError('termsError', error.message);
        } else {
            showError('emailError', error.message); // Fallback
        }
    }
}

// Logout Functionality
async function handleLogout() {
    const session = getSession();
    if (!session) {
        clearSession();
        updateHeaderForLoggedOutUser();
        window.location.href = 'login.html';
        return;
    }

    try {
        await apiRequest('/auth.php?action=logout', 'POST', {
            session_token: session.token
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearSession();
        updateHeaderForLoggedOutUser();
        window.location.href = 'login.html';
    }
}

// Update Header Based on Login Status
function updateHeaderForLoggedInUser(user) {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    const navAuth = document.querySelector('.nav-auth');
    if (navAuth) {
        navAuth.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-link dropdown-toggle text-decoration-none" type="button" id="userDropdown" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle me-1"></i>${user.full_name || user.username}
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="${user.user_type === 'farm_owner' ? '../owner/profile.html' : '../profile.html'}"><i class="bi bi-person me-2"></i>Profile</a></li>
                    ${user.user_type === 'farm_owner' ? '<li><a class="dropdown-item" href="../owner/index.html"><i class="bi bi-house-door me-2"></i>Dashboard</a></li>' : ''}
                    ${user.user_type === 'admin' ? '<li><a class="dropdown-item" href="../admin/index.html"><i class="bi bi-gear me-2"></i>Admin Panel</a></li>' : ''}
                    <li><a class="dropdown-item" href="../orders.html"><i class="bi bi-box-seam me-2"></i>My Orders</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="logout-btn"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
                </ul>
            </div>
        `;
        
        // Add event listener to logout button
        setTimeout(() => {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleLogout();
                });
            }
        }, 100);
    }
}

function updateHeaderForLoggedOutUser() {
    const navAuth = document.querySelector('.nav-auth');
    if (navAuth) {
        navAuth.innerHTML = `
            <a href="login.html" class="login-btn">
                <i class="bi bi-person me-1"></i>Login
            </a>
            <a href="signup.html" class="btn btn-outline-primary btn-sm ms-2">
                Sign Up
            </a>
        `;
    }
}

// Form Validation Functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function validateName(name) {
    return name.trim().length >= 2;
}

// Login Page Handler
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Check if already logged in
    if (checkAuth()) {
        window.location.href = '../index.html';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        let isValid = true;

        if (!email) {
            showError('emailError', 'Email is required');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError('emailError', 'Please enter a valid email address');
            isValid = false;
        }

        if (!password) {
            showError('passwordError', 'Password is required');
            isValid = false;
        }

        if (isValid) {
            await handleLogin(email, password);
        }
    });
}

// Registration Page Handler
function initSignupPage() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    // Check if already logged in
    if (checkAuth()) {
        window.location.href = '../index.html';
    }

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        let isValid = true;

        // Validate first name
        if (!firstName) {
            showError('firstNameError', 'First name is required');
            isValid = false;
        } else if (!validateName(firstName)) {
            showError('firstNameError', 'First name must be at least 2 characters');
            isValid = false;
        }

        // Validate last name
        if (!lastName) {
            showError('lastNameError', 'Last name is required');
            isValid = false;
        } else if (!validateName(lastName)) {
            showError('lastNameError', 'Last name must be at least 2 characters');
            isValid = false;
        }

        // Validate email
        if (!email) {
            showError('emailError', 'Email is required');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError('emailError', 'Please enter a valid email address');
            isValid = false;
        }

        // Validate password
        if (!password) {
            showError('passwordError', 'Password is required');
            isValid = false;
        } else if (!validatePassword(password)) {
            showError('passwordError', 'Password must be at least 8 characters');
            isValid = false;
        }

        // Validate confirm password
        if (!confirmPassword) {
            showError('confirmPasswordError', 'Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            showError('confirmPasswordError', 'Passwords do not match');
            isValid = false;
        }

        // Validate terms
        if (!terms) {
            showError('termsError', 'You must accept the terms and conditions');
            isValid = false;
        }

        if (isValid) {
            await handleRegistration({
                firstName,
                lastName,
                email,
                password,
                confirmPassword,
                terms
            });
        }
    });
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    // Check current page and initialize accordingly
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('login.html')) {
        initLoginPage();
    } else if (currentPage.includes('signup.html')) {
        initSignupPage();
    }
    
    // Initialize logout button if exists
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !logoutBtn.closest('.dropdown')) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Update header based on login status
    const session = getSession();
    if (session) {
        updateHeaderForLoggedInUser(session.user);
    }
});