// Promo Integration for Cart - Standalone Solution
class CartPromoManager {
    constructor() {
        this.promoCodes = this.getPromoCodes();
        console.log('CartPromoManager initialized with codes:', this.promoCodes);
    }

    getPromoCodes() {
        try {
            return JSON.parse(localStorage.getItem('promoCodes')) || [];
        } catch (error) {
            console.error('Error reading promo codes:', error);
            return [];
        }
    }

    validatePromoCodeForCart(code, cartSubtotal) {
        console.log('Validating promo code:', code, 'Subtotal:', cartSubtotal);
        
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
                discount = 0;
                break;
        }

        return {
            valid: true,
            discount: discount,
            freeShipping: freeShipping,
            promo: promo
        };
    }
}

// Initialize global promo manager for cart
window.cartPromoManager = new CartPromoManager();
console.log('CartPromoManager ready:', !!window.cartPromoManager);