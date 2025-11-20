// Owner Profile Management JavaScript
class OwnerProfile {
    constructor() {
        this.ownerData = null;
        this.isEditing = false;
        this.init();
    }

    async init() {
        await this.checkAuthentication();
        await this.loadOwnerData();
        this.setupEventListeners();
        this.populateFormData();
        this.removeLogoutButton(); // Add this line to remove logout button
    }

    async checkAuthentication() {
        const ownerData = localStorage.getItem('farmOwnerData');
        
        if (!ownerData) {
            alert('Please sign up first to access the owner profile.');
            window.location.href = '../auth/owner-signup.html';
            return;
        }

        this.ownerData = JSON.parse(ownerData);
        
        if (!this.ownerData.isLoggedIn) {
            alert('Please login to access your profile.');
            window.location.href = '../auth/owner-login.html';
            return;
        }
    }

    async loadOwnerData() {
        if (this.ownerData) {
            // Update UI with owner data
            this.updateUI();
        }
    }

    // NEW METHOD: Remove logout button from sidebar
    removeLogoutButton() {
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.remove();
        }
        
        // Also check if there's a logout button in the sidebar
        const sidebarNav = document.querySelector('.sidebar-nav');
        const logoutItems = sidebarNav.querySelectorAll('.nav-item');
        logoutItems.forEach(item => {
            if (item.textContent.includes('Logout') || item.querySelector('a').textContent.includes('Logout')) {
                item.remove();
            }
        });
    }

    updateUI() {
        // Update header information
        const ownerName = `${this.ownerData.owner.firstName} ${this.ownerData.owner.lastName}`;
        const farmName = this.ownerData.farm.name;
        
        document.getElementById('owner-name').textContent = ownerName;
        document.getElementById('farm-name').textContent = farmName;
        document.getElementById('display-farm-name').textContent = farmName;
        document.getElementById('profile-farm-name').textContent = farmName;
        
        // Update farm type in profile card
        const farmType = this.getFarmTypeLabel(this.ownerData.farm.type);
        document.getElementById('profile-farm-type').textContent = farmType;
        
        // Update account status information
        document.getElementById('registration-date').textContent = 
            new Date(this.ownerData.registeredAt).toLocaleDateString();
        document.getElementById('last-updated').textContent = 
            new Date(this.ownerData.lastUpdated || this.ownerData.registeredAt).toLocaleDateString();
        
        // Update farm avatar if exists
        if (this.ownerData.farm.avatar) {
            document.getElementById('farm-avatar-preview').src = this.ownerData.farm.avatar;
        }
    }

    populateFormData() {
        if (!this.ownerData) return;

        // Farm Information
        document.getElementById('farm-name-input').value = this.ownerData.farm.name || '';
        document.getElementById('farm-type-select').value = this.ownerData.farm.type || '';
        document.getElementById('farm-location-input').value = this.ownerData.farm.location || '';
        document.getElementById('farm-size-input').value = this.ownerData.farm.size || '';
        document.getElementById('farm-description-textarea').value = this.ownerData.farm.description || '';

        // Product checkboxes
        const products = this.ownerData.business?.products || [];
        products.forEach(product => {
            const checkbox = document.getElementById(`product-${product}`);
            if (checkbox) checkbox.checked = true;
        });

        // Owner Details
        document.getElementById('first-name-input').value = this.ownerData.owner.firstName || '';
        document.getElementById('last-name-input').value = this.ownerData.owner.lastName || '';
        document.getElementById('email-input').value = this.ownerData.owner.email || '';
        document.getElementById('phone-input').value = this.ownerData.owner.phone || '';
        
        // Additional owner details (if available)
        document.getElementById('address-input').value = this.ownerData.owner.address || '';
        document.getElementById('city-input').value = this.ownerData.owner.city || '';
        document.getElementById('state-input').value = this.ownerData.owner.state || '';
        document.getElementById('zip-input').value = this.ownerData.owner.zip || '';
        document.getElementById('country-input').value = this.ownerData.owner.country || '';

        // Business Information
        document.getElementById('business-license-input').value = this.ownerData.business?.license || '';
        document.getElementById('tax-id-input').value = this.ownerData.business?.taxId || '';
        document.getElementById('bank-account-input').value = this.ownerData.business?.bankAccount || '';
        document.getElementById('business-description-textarea').value = this.ownerData.business?.description || '';
        
        // Business hours
        document.getElementById('opening-time').value = this.ownerData.business?.openingTime || '';
        document.getElementById('closing-time').value = this.ownerData.business?.closingTime || '';
    }

    setupEventListeners() {
        // Avatar upload
        document.getElementById('change-avatar-btn').addEventListener('click', () => {
            document.getElementById('farm-avatar-input').click();
        });

        document.getElementById('farm-avatar-input').addEventListener('change', (e) => {
            this.handleAvatarUpload(e.target.files[0]);
        });

        // Form submissions
        document.getElementById('farm-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateFarmInformation();
        });

        document.getElementById('owner-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateOwnerDetails();
        });

        document.getElementById('business-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateBusinessInformation();
        });

        document.getElementById('password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Account deletion
        document.getElementById('delete-account-btn').addEventListener('click', () => {
            this.deleteAccount();
        });

        // Real-time validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        // Email validation
        document.getElementById('email-input').addEventListener('blur', (e) => {
            if (e.target.value && !this.isValidEmail(e.target.value)) {
                this.showError('email-input', 'Please enter a valid email address');
            } else {
                this.clearError('email-input');
            }
        });

        // Password confirmation validation
        document.getElementById('confirm-password-input').addEventListener('blur', (e) => {
            const newPassword = document.getElementById('new-password-input').value;
            if (e.target.value && e.target.value !== newPassword) {
                this.showError('confirm-password-input', 'Passwords do not match');
            } else {
                this.clearError('confirm-password-input');
            }
        });
    }

    async handleAvatarUpload(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Image size should be less than 5MB.');
            return;
        }

        try {
            const imageDataUrl = await this.readFileAsDataURL(file);
            document.getElementById('farm-avatar-preview').src = imageDataUrl;
            
            // Update in owner data
            this.ownerData.farm.avatar = imageDataUrl;
            this.saveOwnerData();
            
            this.showSuccess('Farm avatar updated successfully!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Error uploading image. Please try again.');
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    updateFarmInformation() {
        if (!this.validateFarmForm()) return;

        // Collect form data
        this.ownerData.farm.name = document.getElementById('farm-name-input').value.trim();
        this.ownerData.farm.type = document.getElementById('farm-type-select').value;
        this.ownerData.farm.location = document.getElementById('farm-location-input').value.trim();
        this.ownerData.farm.size = document.getElementById('farm-size-input').value;
        this.ownerData.farm.description = document.getElementById('farm-description-textarea').value.trim();

        // Update products
        const products = [];
        const productCheckboxes = [
            'product-fruits', 'product-vegetables', 'product-dairy',
            'product-meat', 'product-eggs', 'product-other'
        ];
        
        productCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.checked) {
                products.push(id.replace('product-', ''));
            }
        });
        
        if (!this.ownerData.business) this.ownerData.business = {};
        this.ownerData.business.products = products;

        this.saveOwnerData();
        this.updateUI();
        this.showSuccess('Farm information updated successfully!');
    }

    updateOwnerDetails() {
        if (!this.validateOwnerForm()) return;

        // Collect form data
        this.ownerData.owner.firstName = document.getElementById('first-name-input').value.trim();
        this.ownerData.owner.lastName = document.getElementById('last-name-input').value.trim();
        this.ownerData.owner.email = document.getElementById('email-input').value.trim();
        this.ownerData.owner.phone = document.getElementById('phone-input').value.trim();
        
        // Additional details
        this.ownerData.owner.address = document.getElementById('address-input').value.trim();
        this.ownerData.owner.city = document.getElementById('city-input').value.trim();
        this.ownerData.owner.state = document.getElementById('state-input').value.trim();
        this.ownerData.owner.zip = document.getElementById('zip-input').value.trim();
        this.ownerData.owner.country = document.getElementById('country-input').value.trim();

        this.saveOwnerData();
        this.updateUI();
        this.showSuccess('Owner details updated successfully!');
    }

    updateBusinessInformation() {
        if (!this.ownerData.business) this.ownerData.business = {};

        // Collect form data
        this.ownerData.business.license = document.getElementById('business-license-input').value.trim();
        this.ownerData.business.taxId = document.getElementById('tax-id-input').value.trim();
        this.ownerData.business.bankAccount = document.getElementById('bank-account-input').value.trim();
        this.ownerData.business.description = document.getElementById('business-description-textarea').value.trim();
        this.ownerData.business.openingTime = document.getElementById('opening-time').value;
        this.ownerData.business.closingTime = document.getElementById('closing-time').value;

        this.saveOwnerData();
        this.showSuccess('Business information updated successfully!');
    }

    async changePassword() {
        if (!this.validatePasswordForm()) return;

        const currentPassword = document.getElementById('current-password-input').value;
        const newPassword = document.getElementById('new-password-input').value;

        // Verify current password
        if (currentPassword !== this.ownerData.owner.password) {
            this.showError('current-password-input', 'Current password is incorrect');
            return;
        }

        // Update password
        this.ownerData.owner.password = newPassword;
        this.saveOwnerData();

        // Clear form
        document.getElementById('password-form').reset();
        this.showSuccess('Password changed successfully!');
    }

    deleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.')) {
            return;
        }

        if (!confirm('This will permanently delete:\n- All your farm data\n- All your products\n- All order history\n- Your profile information\n\nAre you absolutely sure?')) {
            return;
        }

        const confirmation = prompt('Please type "DELETE" to confirm account deletion:');
        if (confirmation !== 'DELETE') {
            alert('Account deletion cancelled.');
            return;
        }

        // Delete account data
        this.performAccountDeletion();
    }

    performAccountDeletion() {
        try {
            // Remove owner data
            localStorage.removeItem('farmOwnerData');
            
            // Remove farm-specific data
            const farmStorageKey = `farmData_${this.ownerData.id}`;
            localStorage.removeItem(farmStorageKey);
            
            // Remove owner products from localStorage
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts') || '[]');
            const updatedProducts = ownerProducts.filter(product => product.farmId !== this.ownerData.id);
            localStorage.setItem('ownerProducts', JSON.stringify(updatedProducts));
            
            // Remove from admin system (allFarmOwners)
            const allFarms = JSON.parse(localStorage.getItem('allFarmOwners') || '[]');
            const updatedFarms = allFarms.filter(farm => farm.id !== this.ownerData.id);
            localStorage.setItem('allFarmOwners', JSON.stringify(updatedFarms));
            
            alert('Your account has been successfully deleted. You will be redirected to the home page.');
            window.location.href = '../index.html';
            
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Error deleting account. Please try again or contact support.');
        }
    }

    validateFarmForm() {
        let isValid = true;

        const farmName = document.getElementById('farm-name-input').value.trim();
        const farmType = document.getElementById('farm-type-select').value;
        const farmLocation = document.getElementById('farm-location-input').value.trim();

        if (!farmName) {
            this.showError('farm-name-input', 'Farm name is required');
            isValid = false;
        } else {
            this.clearError('farm-name-input');
        }

        if (!farmType) {
            this.showError('farm-type-select', 'Please select farm type');
            isValid = false;
        } else {
            this.clearError('farm-type-select');
        }

        if (!farmLocation) {
            this.showError('farm-location-input', 'Farm location is required');
            isValid = false;
        } else {
            this.clearError('farm-location-input');
        }

        return isValid;
    }

    validateOwnerForm() {
        let isValid = true;

        const firstName = document.getElementById('first-name-input').value.trim();
        const lastName = document.getElementById('last-name-input').value.trim();
        const email = document.getElementById('email-input').value.trim();
        const phone = document.getElementById('phone-input').value.trim();

        if (!firstName) {
            this.showError('first-name-input', 'First name is required');
            isValid = false;
        } else {
            this.clearError('first-name-input');
        }

        if (!lastName) {
            this.showError('last-name-input', 'Last name is required');
            isValid = false;
        } else {
            this.clearError('last-name-input');
        }

        if (!email) {
            this.showError('email-input', 'Email is required');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showError('email-input', 'Please enter a valid email address');
            isValid = false;
        } else {
            this.clearError('email-input');
        }

        if (!phone) {
            this.showError('phone-input', 'Phone number is required');
            isValid = false;
        } else {
            this.clearError('phone-input');
        }

        return isValid;
    }

    validatePasswordForm() {
        let isValid = true;

        const currentPassword = document.getElementById('current-password-input').value;
        const newPassword = document.getElementById('new-password-input').value;
        const confirmPassword = document.getElementById('confirm-password-input').value;

        if (!currentPassword) {
            this.showError('current-password-input', 'Current password is required');
            isValid = false;
        } else {
            this.clearError('current-password-input');
        }

        if (!newPassword) {
            this.showError('new-password-input', 'New password is required');
            isValid = false;
        } else if (newPassword.length < 8) {
            this.showError('new-password-input', 'Password must be at least 8 characters long');
            isValid = false;
        } else {
            this.clearError('new-password-input');
        }

        if (!confirmPassword) {
            this.showError('confirm-password-input', 'Please confirm your new password');
            isValid = false;
        } else if (confirmPassword !== newPassword) {
            this.showError('confirm-password-input', 'Passwords do not match');
            isValid = false;
        } else {
            this.clearError('confirm-password-input');
        }

        return isValid;
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

    clearError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.classList.remove('is-invalid');
        
        const errorElement = field.parentNode.querySelector('.invalid-feedback');
        if (errorElement) {
            errorElement.remove();
        }
    }

    showSuccess(message) {
        // Create and show success alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at the top of main content
        const main = document.querySelector('.owner-main');
        main.insertBefore(alertDiv, main.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    saveOwnerData() {
        // Update timestamp
        this.ownerData.lastUpdated = new Date().toISOString();
        
        // Save to localStorage
        localStorage.setItem('farmOwnerData', JSON.stringify(this.ownerData));
        
        // Also update in admin system
        this.updateAdminSystem();
        
        console.log('Owner data saved:', this.ownerData);
    }

    updateAdminSystem() {
        const allFarms = JSON.parse(localStorage.getItem('allFarmOwners') || '[]');
        const farmIndex = allFarms.findIndex(farm => farm.id === this.ownerData.id);
        
        if (farmIndex !== -1) {
            // Update farm data in admin system (without sensitive info like password)
            const adminFarmData = { ...this.ownerData };
            delete adminFarmData.owner.password; // Don't store password in admin system
            
            allFarms[farmIndex] = adminFarmData;
            localStorage.setItem('allFarmOwners', JSON.stringify(allFarms));
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
}

// Initialize profile management when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.ownerProfile = new OwnerProfile();
});