// Owner Authentication JavaScript
class OwnerAuth {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {
            farm: {},
            owner: {},
            business: {}
        };
        this.init();
    }

    init() {
        this.updateProgressBar();
        this.setupEventListeners();
        this.checkExistingLogin();
    }

    // Check authentication on any owner page
    checkExistingLogin() {
        // Only redirect on owner pages, not on auth pages
        const isAuthPage = window.location.pathname.includes('auth/');
        const isOwnerPage = window.location.pathname.includes('/owner/');
        
        const ownerData = this.getOwnerData();
        
        // If we're on an owner page and not logged in, redirect to login
        if (isOwnerPage && !isAuthPage && (!ownerData || !ownerData.isLoggedIn)) {
            this.redirectToLogin();
            return;
        }
        
        // If we're on auth page and already logged in, redirect to dashboard
        if (isAuthPage && ownerData && ownerData.isLoggedIn) {
            window.location.href = '../owner/dashboard.html';
            return;
        }
        
        // Update farm info on all pages if logged in
        if (ownerData && ownerData.isLoggedIn) {
            this.updateFarmInfo(ownerData);
        }
    }

    getOwnerData() {
        const ownerData = localStorage.getItem('farmOwnerData');
        return ownerData ? JSON.parse(ownerData) : null;
    }

    redirectToLogin() {
        alert('Please login to access your dashboard.');
        window.location.href = '../auth/owner-login.html';
    }

    updateFarmInfo(ownerData = null) {
        if (!ownerData) {
            ownerData = this.getOwnerData();
        }
        
        if (ownerData) {
            // Update farm name in sidebar
            const farmNameEl = document.getElementById('farm-name');
            const displayFarmNameEl = document.getElementById('display-farm-name');
            const ownerNameEl = document.getElementById('owner-name');
            
            const farmName = ownerData.farm.name;
            const ownerName = `${ownerData.owner.firstName} ${ownerData.owner.lastName}`;

            if (farmNameEl) farmNameEl.textContent = farmName;
            if (displayFarmNameEl) displayFarmNameEl.textContent = farmName;
            if (ownerNameEl) ownerNameEl.textContent = ownerName;

            // Update page title with farm name
            const pageTitle = document.title;
            if (!pageTitle.includes(farmName)) {
                document.title = `${farmName} - ${this.getPageTitle()}`;
            }
        }
    }

    getPageTitle() {
        const path = window.location.pathname;
        if (path.includes('products.html')) return 'My Products';
        if (path.includes('orders.html')) return 'Farm Orders';
        if (path.includes('analytics.html')) return 'Analytics';
        if (path.includes('profile.html')) return 'Farm Profile';
        if (path.includes('add-product.html')) return 'Add Product';
        return 'Owner Dashboard';
    }

    setupEventListeners() {
        const farmAvatarInput = document.getElementById('farm-avatar');
        if (farmAvatarInput) {
            farmAvatarInput.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files[0]);
            });
        }

        const formFields = [
            'farm-name', 'farm-type', 'farm-location', 'farm-size',
            'first-name', 'last-name'
        ];
        
        formFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.addEventListener('input', () => this.updatePreview());
            }
        });
    }

    handleImageUpload(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('farm-avatar-preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
                this.formData.farm.avatar = e.target.result;
                this.updatePreview();
            };
            reader.readAsDataURL(file);
        }
    }

    updatePreview() {
        const farmName = document.getElementById('farm-name');
        if (farmName) {
            document.getElementById('farm-name-preview').textContent = farmName.value || 'Farm Name';
        }

        const farmType = document.getElementById('farm-type');
        if (farmType) {
            document.getElementById('preview-type').textContent = this.getFarmTypeLabel(farmType.value) || '-';
        }

        const location = document.getElementById('farm-location');
        if (location) {
            document.getElementById('preview-location').textContent = location.value || '-';
        }

        const size = document.getElementById('farm-size');
        if (size) {
            document.getElementById('preview-size').textContent = size.value ? `${size.value} acres` : '-';
        }

        const firstName = document.getElementById('first-name');
        const lastName = document.getElementById('last-name');
        if (firstName && lastName) {
            const ownerName = firstName.value || lastName.value ? `${firstName.value} ${lastName.value}`.trim() : '-';
            document.getElementById('preview-owner').textContent = ownerName;
        }
    }

    getFarmTypeLabel(type) {
        const types = {
            'crop': 'Crop Farm',
            'livestock': 'Livestock Farm',
            'dairy': 'Dairy Farm',
            'poultry': 'Poultry Farm',
            'mixed': 'Mixed Farming',
            'organic': 'Organic Farm',
            'hydroponic': 'Hydroponic Farm'
        };
        return types[type] || type;
    }

    validateStep(step) {
        switch(step) {
            case 1:
                return this.validateFarmInfo();
            case 2:
                return this.validateOwnerDetails();
            case 3:
                return this.validateBusinessInfo();
            default:
                return true;
        }
    }

    validateFarmInfo() {
        const farmName = document.getElementById('farm-name');
        const farmType = document.getElementById('farm-type');
        const farmLocation = document.getElementById('farm-location');

        if (!farmName || !farmType || !farmLocation) {
            return false; // Elements don't exist on this page
        }

        if (!farmName.value.trim()) {
            this.showError('farm-name', 'Farm name is required');
            return false;
        }

        if (!farmType.value) {
            this.showError('farm-type', 'Please select farm type');
            return false;
        }

        if (!farmLocation.value.trim()) {
            this.showError('farm-location', 'Farm location is required');
            return false;
        }

        this.clearErrors();
        return true;
    }

    validateOwnerDetails() {
        const firstName = document.getElementById('first-name');
        const lastName = document.getElementById('last-name');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirm-password');

        if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
            return false; // Elements don't exist on this page
        }

        if (!firstName.value.trim()) {
            this.showError('first-name', 'First name is required');
            return false;
        }

        if (!lastName.value.trim()) {
            this.showError('last-name', 'Last name is required');
            return false;
        }

        if (!email.value.trim()) {
            this.showError('email', 'Email is required');
            return false;
        }

        if (!this.isValidEmail(email.value.trim())) {
            this.showError('email', 'Please enter a valid email address');
            return false;
        }

        if (!phone.value.trim()) {
            this.showError('phone', 'Phone number is required');
            return false;
        }

        if (!password.value) {
            this.showError('password', 'Password is required');
            return false;
        }

        if (password.value.length < 8) {
            this.showError('password', 'Password must be at least 8 characters long');
            return false;
        }

        if (password.value !== confirmPassword.value) {
            this.showError('confirm-password', 'Passwords do not match');
            return false;
        }

        this.clearErrors();
        return true;
    }

    validateBusinessInfo() {
        const terms = document.getElementById('terms');
        if (!terms) {
            return false; // Element doesn't exist on this page
        }

        if (!terms.checked) {
            this.showError('terms', 'You must accept the terms and conditions');
            return false;
        }

        this.clearErrors();
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.classList.add('is-invalid');
        
        let errorElement = field.parentNode.querySelector('.invalid-feedback');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'invalid-feedback';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    clearErrors() {
        const errorFields = document.querySelectorAll('.is-invalid');
        errorFields.forEach(field => field.classList.remove('is-invalid'));
        
        const errorMessages = document.querySelectorAll('.invalid-feedback');
        errorMessages.forEach(msg => msg.remove());
    }

    collectFormData() {
        const farmName = document.getElementById('farm-name');
        const farmType = document.getElementById('farm-type');
        const farmLocation = document.getElementById('farm-location');
        const farmSize = document.getElementById('farm-size');
        const farmDescription = document.getElementById('farm-description');
        const firstName = document.getElementById('first-name');
        const lastName = document.getElementById('last-name');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const password = document.getElementById('password');

        if (farmName && farmType && farmLocation && firstName && lastName && email && phone && password) {
            this.formData.farm = {
                name: farmName.value.trim(),
                type: farmType.value,
                location: farmLocation.value.trim(),
                size: farmSize ? farmSize.value : '',
                description: farmDescription ? farmDescription.value.trim() : '',
                avatar: this.formData.farm.avatar || ''
            };

            this.formData.owner = {
                firstName: firstName.value.trim(),
                lastName: lastName.value.trim(),
                email: email.value.trim(),
                phone: phone.value.trim(),
                password: password.value
            };

            this.formData.business = {
                license: document.getElementById('business-license') ? document.getElementById('business-license').value.trim() : '',
                taxId: document.getElementById('tax-id') ? document.getElementById('tax-id').value.trim() : '',
                bankAccount: document.getElementById('bank-account') ? document.getElementById('bank-account').value.trim() : '',
                products: this.getSelectedProducts(),
                termsAccepted: document.getElementById('terms') ? document.getElementById('terms').checked : false
            };
        }
    }

    getSelectedProducts() {
        const products = [];
        const checkboxes = [
            'product-fruits', 'product-vegetables', 'product-dairy',
            'product-meat', 'product-eggs', 'product-other'
        ];
        
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.checked) {
                products.push(id.replace('product-', ''));
            }
        });
        
        return products;
    }

    saveOwnerData() {
        const ownerId = 'farm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const ownerData = {
            id: ownerId,
            farm: this.formData.farm,
            owner: this.formData.owner,
            business: this.formData.business,
            registeredAt: new Date().toISOString(),
            isLoggedIn: true,
            status: 'active',
            totalRevenue: 0,
            adminCommission: 0,
            netEarnings: 0
        };
        
        // Save to owner's local storage
        localStorage.setItem('farmOwnerData', JSON.stringify(ownerData));
        
        // Register farm with admin system
        this.registerWithAdmin(ownerData);
        
        return ownerData;
    }

    registerWithAdmin(ownerData) {
        // Get existing farms from admin system
        const allFarms = JSON.parse(localStorage.getItem('allFarmOwners') || '[]');
        
        // Check if farm already exists
        const existingFarm = allFarms.find(farm => farm.owner.email === ownerData.owner.email);
        
        if (!existingFarm) {
            // Add new farm to admin system
            allFarms.push({
                ...ownerData,
                isLoggedIn: false // Admin should not have login status
            });
            
            localStorage.setItem('allFarmOwners', JSON.stringify(allFarms));
            console.log('Farm registered with admin system');
        }
        
        return ownerData;
    }

    updateProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        if (!progressBar) return; // Exit if progress bar doesn't exist on this page
        
        const progress = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        progressBar.style.width = `${progress}%`;
    }

    // Static method to check authentication on any page
    static checkAuth() {
        const ownerAuth = new OwnerAuth();
        return ownerAuth.getOwnerData();
    }

    // Static method to get current farm data
    static getCurrentFarm() {
        const ownerData = OwnerAuth.checkAuth();
        return ownerData ? ownerData.farm : null;
    }

    // Static method to logout
    static logout() {
        if (confirm('Are you sure you want to logout?')) {
            const ownerData = localStorage.getItem('farmOwnerData');
            if (ownerData) {
                const data = JSON.parse(ownerData);
                data.isLoggedIn = false;
                localStorage.setItem('farmOwnerData', JSON.stringify(data));
            }
            window.location.href = '../auth/owner-login.html';
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                OwnerAuth.logout();
            });
        }
    }
}

// Global functions for step navigation (only on registration page)
function nextStep(step) {
    if (window.ownerAuth && window.ownerAuth.validateStep(step - 1)) {
        showStep(step);
    }
}

function prevStep(step) {
    if (window.ownerAuth) {
        showStep(step);
    }
}

function showStep(step) {
    if (!window.ownerAuth) return;
    
    document.querySelectorAll('.step-form').forEach(form => {
        form.classList.remove('active');
    });

    document.querySelectorAll('.step').forEach(stepEl => {
        const stepNumber = parseInt(stepEl.dataset.step);
        stepEl.classList.remove('active');
        if (stepNumber < step) {
            stepEl.classList.add('completed');
        } else if (stepNumber === step) {
            stepEl.classList.add('active');
        }
    });

    const stepForm = document.getElementById(`step-${step}`);
    if (stepForm) {
        stepForm.classList.add('active');
    }
    
    window.ownerAuth.currentStep = step;
    window.ownerAuth.updateProgressBar();
}

function completeSignup() {
    if (window.ownerAuth && window.ownerAuth.validateStep(3)) {
        window.ownerAuth.collectFormData();
        const savedData = window.ownerAuth.saveOwnerData();
        
        console.log('Owner registered:', savedData);
        updateSuccessMessage();
        showStep(4);
    }
}

function updateSuccessMessage() {
    const farmName = document.getElementById('farm-name');
    if (farmName && farmName.value) {
        const successFarmName = document.getElementById('success-farm-name');
        if (successFarmName) {
            successFarmName.textContent = farmName.value;
        }
    }
}

// Auto-check authentication on page load for all owner pages
document.addEventListener('DOMContentLoaded', function() {
    // Initialize owner auth
    window.ownerAuth = new OwnerAuth();
    
    // Add logout functionality to all pages
    if (window.ownerAuth) {
        window.ownerAuth.setupLogout();
    }
});