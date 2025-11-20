// Centralized Cart Manager with Enhanced Promo Integration - FIXED VERSION
class CartManager {
    constructor() {
        console.log('CartManager initializing...');
        this.cart = this.initializeCart();
        this.init();
    }

    initializeCart() {
        try {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            console.log('Initial cart from localStorage:', cart);
            
            // Ensure cart is always an array
            if (!Array.isArray(cart)) {
                console.warn('Cart was not an array, resetting to empty array');
                return [];
            }
            
            // Validate and clean up cart items
            return cart.filter(item => this.isValidCartItem(item));
        } catch (error) {
            console.error('Error reading cart from localStorage:', error);
            return [];
        }
    }

    init() {
        console.log('CartManager init called');
        this.updateCartCounter();
        window.addEventListener('storage', this.handleStorageEvent.bind(this));
        this.forceCounterUpdate();
        
        // Clean up any invalid cart items on initialization
        this.cleanInvalidCartItems();
        
        // Mark as ready
        window.cartManagerReady = true;
        console.log('CartManager ready with cart:', this.cart);
    }

    handleStorageEvent(event) {
        if (event.key === 'cart') {
            this.cart = this.initializeCart();
            this.updateCartCounter();
            this.dispatchCartUpdateEvent();
        }
    }

    // Check if cart item is valid (has required properties)
    isValidCartItem(item) {
        if (!item || typeof item !== 'object') {
            console.log('Invalid item: not an object', item);
            return false;
        }
        
        // Check for required properties
        const hasRequiredProps = item.id && item.name && typeof item.price === 'number';
        if (!hasRequiredProps) {
            console.log('Invalid item: missing required properties', item);
            return false;
        }
        
        // Check if price is valid
        if (isNaN(item.price) || item.price < 0) {
            console.log('Invalid item: invalid price', item);
            return false;
        }
        
        // Check if quantity is valid
        const quantity = item.quantity || 1;
        if (isNaN(quantity) || quantity < 1) {
            console.log('Invalid item: invalid quantity', item);
            return false;
        }
        
        return true;
    }

    // Clean up invalid cart items
    cleanInvalidCartItems() {
        const originalLength = this.cart.length;
        this.cart = this.cart.filter(item => this.isValidCartItem(item));
        
        if (this.cart.length !== originalLength) {
            console.log(`Cleaned up ${originalLength - this.cart.length} invalid cart items`);
            this.saveCart();
        }
    }

    saveCart() {
        try {
            // Ensure cart is always an array before saving
            if (!Array.isArray(this.cart)) {
                console.warn('Cart is not an array, resetting to empty array');
                this.cart = [];
            }
            
            localStorage.setItem('cart', JSON.stringify(this.cart));
            console.log('Cart saved to localStorage:', this.cart);
            this.updateCartCounter();
            this.dispatchCartUpdateEvent();
            window.dispatchEvent(new Event('storage'));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }

    getProducts() {
        try {
            const products = JSON.parse(localStorage.getItem('farmProducts')) || [];
            console.log('Available products:', products);
            return products;
        } catch (error) {
            console.error('Error reading products from localStorage:', error);
            return [];
        }
    }

    addItem(productId, quantity = 1) {
        console.log('Adding product to cart:', productId, quantity);
        
        const products = this.getProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            console.error('Product not found in farmProducts:', productId);
            this.showNotification('Product not available', 'error');
            return false;
        }

        // Check if product is active
        if (product.status !== 'active' && product.status !== 'approved') {
            this.showNotification('This product is not available for purchase', 'error');
            return false;
        }

        // Ensure cart is an array
        if (!Array.isArray(this.cart)) {
            console.warn('Cart is not an array, resetting');
            this.cart = [];
        }

        // Check if product already exists in cart
        const existingItemIndex = this.cart.findIndex(item => item.id === productId);
        
        if (existingItemIndex !== -1) {
            // Update existing item quantity
            this.cart[existingItemIndex].quantity += quantity;
            console.log('Updated existing item quantity:', this.cart[existingItemIndex]);
        } else {
            // Create new cart item with product data
            const newCartItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category || 'uncategorized',
                image: product.image || 
                      (product.images && product.images[0]) || 
                      'assets/img/placeholder.jpg',
                weight: product.details?.weight || product.weight || 'N/A',
                quantity: quantity
            };
            
            console.log('Creating new cart item:', newCartItem);
            this.cart.push(newCartItem);
        }
        
        this.saveCart();
        this.showNotification(`${product.name} added to cart`);
        return true;
    }

    updateQuantity(index, change) {
        // Ensure cart is an array
        if (!Array.isArray(this.cart)) {
            console.warn('Cart is not an array, cannot update quantity');
            return false;
        }

        if (this.cart[index]) {
            this.cart[index].quantity += change;
            
            if (this.cart[index].quantity <= 0) {
                const removedItem = this.cart.splice(index, 1)[0];
                console.log('Removed item due to zero quantity:', removedItem);
            } else {
                console.log('Updated quantity for item:', this.cart[index]);
            }
            
            this.saveCart();
            return true;
        }
        console.log('Item not found at index:', index);
        return false;
    }

    removeItem(index) {
        // Ensure cart is an array
        if (!Array.isArray(this.cart)) {
            console.warn('Cart is not an array, cannot remove item');
            return null;
        }

        if (this.cart[index]) {
            const removedItem = this.cart.splice(index, 1)[0];
            console.log('Removed item:', removedItem);
            this.saveCart();
            return removedItem;
        }
        console.log('Item not found at index:', index);
        return null;
    }

    clearCart() {
        console.log('Clearing cart');
        this.cart = [];
        this.saveCart();
    }

    getTotalItems() {
        // Ensure cart is an array
        if (!Array.isArray(this.cart)) {
            console.warn('Cart is not an array, returning 0');
            return 0;
        }

        const total = this.cart.reduce((total, item) => total + (item.quantity || 1), 0);
        console.log('Total items in cart:', total);
        return total;
    }

    getSubtotal() {
        // Ensure cart is an array
        if (!Array.isArray(this.cart)) {
            console.warn('Cart is not an array, returning 0');
            return 0;
        }

        const subtotal = this.cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 1)), 0);
        console.log('Cart subtotal:', subtotal);
        return subtotal;
    }

    // Get cart item by product ID
    getCartItem(productId) {
        if (!Array.isArray(this.cart)) return null;
        return this.cart.find(item => item.id === productId);
    }

    // Check if product is in cart
    isInCart(productId) {
        if (!Array.isArray(this.cart)) return false;
        return this.cart.some(item => item.id === productId);
    }

    updateCartCounter() {
        const totalItems = this.getTotalItems();
        console.log('Updating cart counter with total items:', totalItems);
        
        const cartCounter = document.querySelector('.cart-counter');
        
        if (cartCounter) {
            cartCounter.textContent = totalItems;
            cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
            cartCounter.style.visibility = 'visible';
            cartCounter.style.opacity = '1';
            
            if (totalItems === 0) {
                cartCounter.style.background = 'color-mix(in srgb, var(--default-color), transparent 30%)';
            } else {
                cartCounter.style.background = 'var(--accent-color)';
            }
            
            console.log('Cart counter updated:', cartCounter.textContent);
        } else {
            console.log('Cart counter element not found');
        }
        
        // Also update any elements with class 'cart-count'
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(element => {
            element.textContent = totalItems;
            element.style.display = totalItems > 0 ? 'inline' : 'none';
            console.log('Cart count element updated:', element.textContent);
        });

        // Update cart badge in mobile view
        const mobileCartBadge = document.querySelector('.mobile-cart-badge');
        if (mobileCartBadge) {
            mobileCartBadge.textContent = totalItems;
            mobileCartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    forceCounterUpdate() {
        console.log('Forcing cart counter update');
        setTimeout(() => {
            this.updateCartCounter();
        }, 100);
        
        // Also update on page load completion
        if (document.readyState === 'loading') {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.updateCartCounter();
                }, 500);
            });
        } else {
            setTimeout(() => {
                this.updateCartCounter();
            }, 500);
        }
    }

    dispatchCartUpdateEvent() {
        // Ensure cart is an array before dispatching
        if (!Array.isArray(this.cart)) {
            console.warn('Cart is not an array, resetting for event dispatch');
            this.cart = [];
        }

        const event = new CustomEvent('cartUpdated', {
            detail: { 
                cart: [...this.cart],
                totalItems: this.getTotalItems(),
                subtotal: this.getSubtotal()
            }
        });
        console.log('Dispatching cart updated event:', event.detail);
        window.dispatchEvent(event);
    }

    showNotification(message, type = 'success') {
        console.log('Cart notification:', message, type);
        
        let notification = document.getElementById('cart-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'cart-notification';
            notification.className = 'cart-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                transform: translateX(400px);
                opacity: 0;
                transition: all 0.3s ease;
                border-left: 4px solid ${type === 'success' ? '#28a745' : '#dc3545'};
            `;
            document.body.appendChild(notification);
        }
        
        const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill';
        const iconColor = type === 'success' ? '#28a745' : '#dc3545';
        
        notification.innerHTML = `
            <i class="bi ${icon}" style="color: ${iconColor};"></i>
            <span class="notification-text">${message}</span>
        `;
        
        notification.className = `cart-notification ${type}`;
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
        }, 3000);
    }

    // Get current cart for external use
    getCart() {
        // Ensure we return a proper array
        if (!Array.isArray(this.cart)) {
            console.warn('Cart is not an array, returning empty array');
            return [];
        }
        return [...this.cart];
    }
}

// Initialize cart manager with error handling
console.log('Creating global cart manager instance...');
try {
    window.cartManager = new CartManager();
    console.log('Cart manager instance created successfully:', !!window.cartManager);
} catch (error) {
    console.error('Failed to create cart manager:', error);
    // Create a basic fallback cart manager
    window.cartManager = {
        getCart: () => JSON.parse(localStorage.getItem('cart')) || [],
        addItem: (productId, quantity) => {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const products = JSON.parse(localStorage.getItem('farmProducts')) || [];
            const product = products.find(p => p.id === productId);
            
            if (product) {
                const existingItem = cart.find(item => item.id === productId);
                if (existingItem) {
                    existingItem.quantity += quantity;
                } else {
                    cart.push({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: quantity,
                        image: product.image || 'assets/img/placeholder.jpg'
                    });
                }
                localStorage.setItem('cart', JSON.stringify(cart));
                return true;
            }
            return false;
        }
    };
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartManager;
}