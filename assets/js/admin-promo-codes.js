// Promo Code Management for Admin
class PromoManager {
    constructor() {
        this.promoCodes = this.getPromoCodes();
        this.editingPromo = null;
        this.init();
    }

    init() {
        this.loadPromoCodes();
        this.setupEventListeners();
        
        // Set default start date to current date/time for new promos
        this.setDefaultStartDate();
    }

    getPromoCodes() {
        try {
            return JSON.parse(localStorage.getItem('promoCodes')) || [];
        } catch (error) {
            console.error('Error reading promo codes:', error);
            return [];
        }
    }

    savePromoCodes() {
        try {
            localStorage.setItem('promoCodes', JSON.stringify(this.promoCodes));
            return true;
        } catch (error) {
            console.error('Error saving promo codes:', error);
            this.showNotification('Error saving promo codes', 'error');
            return false;
        }
    }

    setDefaultStartDate() {
        const startDateInput = document.getElementById('promo-start-date');
        if (startDateInput && !startDateInput.value) {
            // Set to current date/time in the proper format for datetime-local input
            const now = new Date();
            // Format: YYYY-MM-DDTHH:MM
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            
            const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            startDateInput.value = currentDateTime;
        }
    }

    loadPromoCodes() {
        const tableBody = document.getElementById('promo-codes-table');
        if (!tableBody) return;

        if (this.promoCodes.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="bi bi-tag display-4 text-muted d-block mb-2"></i>
                        <h5>No promo codes found</h5>
                        <p class="text-muted">Create your first promo code to get started</p>
                        <button class="btn btn-primary" onclick="promoManager.showCreateModal()">
                            <i class="bi bi-plus-circle me-2"></i>Create Promo Code
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.promoCodes.map(promo => `
            <tr data-promo-id="${promo.id}">
                <td>
                    <strong class="text-uppercase">${promo.code}</strong>
                    ${promo.description ? `<br><small class="text-muted">${promo.description}</small>` : ''}
                </td>
                <td>
                    <span class="badge ${this.getTypeBadgeClass(promo.type)}">
                        ${this.formatPromoType(promo.type)}
                    </span>
                </td>
                <td>
                    ${this.formatPromoValue(promo.type, promo.value)}
                </td>
                <td>
                    <small>
                        ${promo.usedCount || 0} / ${promo.maxUses ? promo.maxUses : '∞'} uses
                    </small>
                </td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(promo.status)}">
                        ${promo.status}
                    </span>
                </td>
                <td>
                    ${promo.expiryDate ? new Date(promo.expiryDate).toLocaleDateString() : 'Never'}
                    ${this.isExpired(promo) ? '<br><small class="text-danger">Expired</small>' : ''}
                    ${this.isScheduled(promo) ? '<br><small class="text-warning">Scheduled</small>' : ''}
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="promoManager.editPromoCode('${promo.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="promoManager.deletePromoCode('${promo.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getTypeBadgeClass(type) {
        const classes = {
            percentage: 'bg-info',
            fixed: 'bg-success',
            free_shipping: 'bg-warning'
        };
        return classes[type] || 'bg-secondary';
    }

    getStatusBadgeClass(status) {
        const classes = {
            active: 'bg-success',
            inactive: 'bg-secondary',
            expired: 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    formatPromoType(type) {
        const types = {
            percentage: 'Percentage',
            fixed: 'Fixed Amount',
            free_shipping: 'Free Shipping'
        };
        return types[type] || type;
    }

    formatPromoValue(type, value) {
        switch (type) {
            case 'percentage':
                return `${value}% off`;
            case 'fixed':
                return `$${parseFloat(value).toFixed(2)} off`;
            case 'free_shipping':
                return 'Free Shipping';
            default:
                return value;
        }
    }

    isExpired(promo) {
        if (promo.expiryDate) {
            return new Date(promo.expiryDate) < new Date();
        }
        return false;
    }

    isScheduled(promo) {
        if (promo.startDate) {
            return new Date(promo.startDate) > new Date();
        }
        return false;
    }

    setupEventListeners() {
        // Auto-format promo code input
        const promoCodeInput = document.getElementById('promo-code');
        if (promoCodeInput) {
            promoCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }

        // Show/hide value field based on type
        const promoTypeSelect = document.getElementById('promo-type');
        if (promoTypeSelect) {
            promoTypeSelect.addEventListener('change', (e) => {
                this.toggleValueField(e.target.value);
            });
        }

        // Auto-set start date when modal opens for new promos
        document.getElementById('promo-modal').addEventListener('click', (e) => {
            if (e.target.id === 'promo-modal' && !this.editingPromo) {
                this.setDefaultStartDate();
            }
        });
    }

    toggleValueField(type) {
        const valueInput = document.getElementById('promo-value');
        const valueLabel = valueInput.previousElementSibling;

        if (type === 'free_shipping') {
            valueInput.value = '0';
            valueInput.disabled = true;
            valueInput.required = false;
            valueLabel.textContent = 'Discount Value';
        } else {
            valueInput.disabled = false;
            valueInput.required = true;
            if (type === 'percentage') {
                valueInput.step = '1';
                valueInput.min = '1';
                valueInput.max = '100';
                valueLabel.textContent = 'Discount Percentage *';
            } else {
                valueInput.step = '0.01';
                valueInput.min = '0.01';
                valueInput.max = '';
                valueLabel.textContent = 'Discount Amount *';
            }
        }
    }

    showCreateModal() {
        this.editingPromo = null;
        document.getElementById('promo-modal-title').textContent = 'Create Promo Code';
        document.getElementById('save-promo-btn').textContent = 'Create Promo Code';
        document.getElementById('promo-form').reset();
        
        // Set default start date to current date/time
        this.setDefaultStartDate();
        
        this.toggleValueField('percentage');
        this.openModal();
    }

    editPromoCode(promoId) {
        const promo = this.promoCodes.find(p => p.id === promoId);
        if (!promo) return;

        this.editingPromo = promo;
        document.getElementById('promo-modal-title').textContent = 'Edit Promo Code';
        document.getElementById('save-promo-btn').textContent = 'Update Promo Code';

        // Fill form with promo data
        document.getElementById('promo-code').value = promo.code;
        document.getElementById('promo-type').value = promo.type;
        document.getElementById('promo-value').value = promo.value;
        document.getElementById('promo-min-order').value = promo.minOrder || '';
        document.getElementById('promo-max-uses').value = promo.maxUses || '';
        document.getElementById('promo-status').value = promo.status;
        
        // Format dates for datetime-local input
        if (promo.startDate) {
            const startDate = new Date(promo.startDate);
            const startDateFormatted = startDate.toISOString().slice(0, 16);
            document.getElementById('promo-start-date').value = startDateFormatted;
        } else {
            document.getElementById('promo-start-date').value = '';
        }
        
        if (promo.expiryDate) {
            const expiryDate = new Date(promo.expiryDate);
            const expiryDateFormatted = expiryDate.toISOString().slice(0, 16);
            document.getElementById('promo-expiry-date').value = expiryDateFormatted;
        } else {
            document.getElementById('promo-expiry-date').value = '';
        }
        
        document.getElementById('promo-description').value = promo.description || '';

        this.toggleValueField(promo.type);
        this.openModal();
    }

    openModal() {
        document.getElementById('promo-modal').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        document.getElementById('promo-modal').style.display = 'none';
        document.body.style.overflow = 'auto';
        this.editingPromo = null;
    }

    savePromoCode() {
        const form = document.getElementById('promo-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Get form values
        const code = document.getElementById('promo-code').value.trim();
        const type = document.getElementById('promo-type').value;
        const value = parseFloat(document.getElementById('promo-value').value);
        const minOrder = document.getElementById('promo-min-order').value ? 
                        parseFloat(document.getElementById('promo-min-order').value) : null;
        const maxUses = document.getElementById('promo-max-uses').value ? 
                       parseInt(document.getElementById('promo-max-uses').value) : null;
        const status = document.getElementById('promo-status').value;
        const startDateInput = document.getElementById('promo-start-date').value;
        const expiryDateInput = document.getElementById('promo-expiry-date').value;
        const description = document.getElementById('promo-description').value.trim();

        // For new promos, use current date/time if start date is empty
        let startDate = startDateInput;
        if (!this.editingPromo && !startDateInput) {
            startDate = new Date().toISOString();
        } else if (startDateInput) {
            startDate = new Date(startDateInput).toISOString();
        } else {
            startDate = null;
        }

        // Convert expiry date to ISO string if provided
        let expiryDate = expiryDateInput ? new Date(expiryDateInput).toISOString() : null;

        const promoData = {
            code: code,
            type: type,
            value: value,
            minOrder: minOrder,
            maxUses: maxUses,
            status: status,
            startDate: startDate,
            expiryDate: expiryDate,
            description: description,
            usedCount: this.editingPromo ? (this.editingPromo.usedCount || 0) : 0,
            createdAt: this.editingPromo ? this.editingPromo.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Validate promo code
        if (!this.validatePromoCode(promoData)) {
            return;
        }

        if (this.editingPromo) {
            // Update existing promo - preserve creation date
            promoData.createdAt = this.editingPromo.createdAt;
            Object.assign(this.editingPromo, promoData);
            this.showNotification('Promo code updated successfully');
        } else {
            // Create new promo
            promoData.id = 'promo_' + Date.now();
            this.promoCodes.unshift(promoData);
            this.showNotification('Promo code created successfully');
        }

        if (this.savePromoCodes()) {
            this.loadPromoCodes();
            this.closeModal();
        }
    }

    validatePromoCode(promoData) {
        // Check if code already exists (excluding current editing promo)
        const existingPromo = this.promoCodes.find(p => 
            p.code === promoData.code && 
            (!this.editingPromo || p.id !== this.editingPromo.id)
        );

        if (existingPromo) {
            this.showNotification('Promo code already exists', 'error');
            return false;
        }

        // Validate percentage range
        if (promoData.type === 'percentage' && (promoData.value < 1 || promoData.value > 100)) {
            this.showNotification('Percentage must be between 1 and 100', 'error');
            return false;
        }

        // Validate fixed amount
        if (promoData.type === 'fixed' && promoData.value <= 0) {
            this.showNotification('Fixed amount must be greater than 0', 'error');
            return false;
        }

        // Validate dates
        if (promoData.startDate && promoData.expiryDate) {
            const start = new Date(promoData.startDate);
            const expiry = new Date(promoData.expiryDate);
            
            if (start >= expiry) {
                this.showNotification('Expiry date must be after start date', 'error');
                return false;
            }
        }

        // Auto-set status based on dates
        this.autoSetPromoStatus(promoData);

        return true;
    }

    autoSetPromoStatus(promoData) {
        const now = new Date();
        
        if (promoData.expiryDate && new Date(promoData.expiryDate) < now) {
            promoData.status = 'expired';
        } else if (promoData.startDate && new Date(promoData.startDate) > now) {
            promoData.status = 'inactive'; // Or you could create a 'scheduled' status
        } else if (promoData.status === 'expired' && promoData.expiryDate && new Date(promoData.expiryDate) > now) {
            // If editing and expiry date is in future, set back to active
            promoData.status = 'active';
        }
    }

    deletePromoCode(promoId) {
        if (!confirm('Are you sure you want to delete this promo code? This action cannot be undone.')) {
            return;
        }

        this.promoCodes = this.promoCodes.filter(p => p.id !== promoId);
        
        if (this.savePromoCodes()) {
            this.loadPromoCodes();
            this.showNotification('Promo code deleted successfully');
        }
    }

    showNotification(message, type = 'success') {
        // Create notification element
        let notification = document.getElementById('promo-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'promo-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
                color: ${type === 'success' ? '#155724' : '#721c24'};
                padding: 12px 20px;
                border-radius: 4px;
                border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
                z-index: 10000;
                transform: translateX(400px);
                opacity: 0;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
        }, 3000);
    }

    // Method to validate promo code in cart (for cart-manager.js integration)
    validatePromoCodeForCart(code, cartSubtotal) {
        const promo = this.promoCodes.find(p => 
            p.code === code.toUpperCase() && 
            p.status === 'active'
        );

        if (!promo) {
            return { valid: false, message: 'Invalid promo code' };
        }

        const now = new Date();

        // Check if not started yet
        if (promo.startDate && new Date(promo.startDate) > now) {
            const startDate = new Date(promo.startDate).toLocaleDateString();
            return { 
                valid: false, 
                message: `Promo code starts on ${startDate}` 
            };
        }

        // Check if expired
        if (promo.expiryDate && new Date(promo.expiryDate) < now) {
            return { valid: false, message: 'Promo code has expired' };
        }

        // Check minimum order
        if (promo.minOrder && cartSubtotal < promo.minOrder) {
            return { 
                valid: false, 
                message: `Minimum order of $${promo.minOrder} required` 
            };
        }

        // Check usage limits
        if (promo.maxUses && (promo.usedCount || 0) >= promo.maxUses) {
            return { valid: false, message: 'Promo code usage limit reached' };
        }

        return { valid: true, promo: promo };
    }

    // Method to apply promo code (for cart-manager.js integration)
    applyPromoCode(code, cartSubtotal) {
        const validation = this.validatePromoCodeForCart(code, cartSubtotal);
        
        if (!validation.valid) {
            return validation;
        }

        const promo = validation.promo;
        let discount = 0;
        let freeShipping = false;

        switch (promo.type) {
            case 'percentage':
                discount = cartSubtotal * (promo.value / 100);
                break;
            case 'fixed':
                discount = Math.min(promo.value, cartSubtotal);
                break;
            case 'free_shipping':
                freeShipping = true;
                discount = 0; // Free shipping is handled separately
                break;
        }

        // Increment usage count
        promo.usedCount = (promo.usedCount || 0) + 1;
        this.savePromoCodes();

        return {
            valid: true,
            discount: discount,
            freeShipping: freeShipping,
            promo: promo
        };
    }

    // Method to get promo code statistics
    getPromoStats() {
        const totalPromos = this.promoCodes.length;
        const activePromos = this.promoCodes.filter(p => p.status === 'active').length;
        const expiredPromos = this.promoCodes.filter(p => p.status === 'expired').length;
        const totalUses = this.promoCodes.reduce((sum, promo) => sum + (promo.usedCount || 0), 0);
        
        return {
            totalPromos,
            activePromos,
            expiredPromos,
            totalUses
        };
    }
}

// Initialize promo manager
const promoManager = new PromoManager();