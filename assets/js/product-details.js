// Product Details Management - INDEXEDDB VERSION
class ProductDetails {
    constructor() {
        this.products = [];
        this.currentProduct = null;
        this.init();
    }

    async init() {
        console.log('ProductDetails initializing...');
        await this.loadProductsFromDB();
        
        try {
            await this.waitForCartManager();
        } catch (error) {
            console.error('Failed to initialize cart manager:', error);
        }
        
        this.loadProductDetails();
        this.setupEventListeners();
        this.initializeSwiper();
    }

    // Load products from IndexedDB (IMPROVED VERSION)
    async loadProductsFromDB() {
        try {
            // Try multiple methods to load products
            let loadedProducts = [];
            
            // Method 1: Try ProductManager
            if (window.productManager) {
                loadedProducts = window.productManager.getAllProducts();
                console.log('Products loaded from ProductManager:', loadedProducts.length);
            }
            
            // Method 2: Try direct IndexedDB access
            if (loadedProducts.length === 0) {
                loadedProducts = await this.getProductsFromDB();
                console.log('Products loaded directly from IndexedDB:', loadedProducts.length);
            }
            
            // Method 3: Fallback to localStorage
            if (loadedProducts.length === 0) {
                loadedProducts = this.loadProductsFromLocalStorage();
                console.log('Products loaded from localStorage:', loadedProducts.length);
            }

            this.products = loadedProducts;
            
        } catch (error) {
            console.error('Error loading products from DB:', error);
            this.products = [];
        }
    }

    // Direct IndexedDB access as fallback
    async getProductsFromDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FarmMarketDB', 4);
            
            request.onerror = () => {
                console.error('Failed to open database');
                resolve([]);
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                try {
                    const transaction = db.transaction(['products'], 'readonly');
                    const store = transaction.objectStore('products');
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onerror = () => {
                        console.error('Failed to get products from store');
                        resolve([]);
                    };
                    
                    getAllRequest.onsuccess = () => {
                        resolve(getAllRequest.result || []);
                    };
                } catch (error) {
                    console.error('Error in IndexedDB transaction:', error);
                    resolve([]);
                }
            };
            
            request.onupgradeneeded = (event) => {
                // Database doesn't exist yet
                resolve([]);
            };
        });
    }

    // Load from localStorage as fallback
    loadProductsFromLocalStorage() {
        try {
            const farmProducts = JSON.parse(localStorage.getItem('farmProducts')) || [];
            return farmProducts.filter(product => product.status === 'active' || product.status === 'approved');
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    }

    waitForCartManager() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkCartManager = () => {
                attempts++;
                if (window.cartManager) {
                    console.log('Cart manager found after', attempts, 'attempts');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Cart manager not available after waiting'));
                } else {
                    setTimeout(checkCartManager, 100);
                }
            };
            
            checkCartManager();
        });
    }

    loadProductDetails() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');

            if (!productId) {
                this.showError('Product ID not specified in URL');
                return;
            }

            console.log('Loading product details for ID:', productId);
            console.log('Available products:', this.products.map(p => ({ id: p.id, name: p.name })));

            this.currentProduct = this.products.find(product => product.id === productId);

            if (!this.currentProduct) {
                this.showError('Product not found');
                return;
            }

            console.log('Current product found:', this.currentProduct);
            this.displayProductDetails();
        } catch (error) {
            console.error('Error loading product details:', error);
            this.showError('Failed to load product details');
        }
    }

    displayProductDetails() {
        try {
            // Update basic info
            document.getElementById('product-title').textContent = this.currentProduct.name;
            document.getElementById('product-short-desc').textContent = this.currentProduct.description ? this.currentProduct.description.substring(0, 100) + '...' : 'No description available';
            document.getElementById('breadcrumb-product').textContent = this.currentProduct.name;
            document.getElementById('product-name').textContent = this.currentProduct.name;
            document.getElementById('product-price').textContent = `$${this.currentProduct.price?.toFixed(2) || '0.00'}`;
            document.getElementById('product-description-full').textContent = this.currentProduct.description || 'No description available';

            // Update category
            const categoryElements = document.querySelectorAll('#product-category, #product-category-summary');
            categoryElements.forEach(el => {
                el.textContent = this.formatCategory(this.currentProduct.category);
            });

            // Update product info
            document.getElementById('product-id').textContent = this.currentProduct.id;
            document.getElementById('product-weight').textContent = this.currentProduct.details?.weight || this.currentProduct.weight || 'N/A';
            document.getElementById('product-origin').textContent = this.currentProduct.details?.origin || this.currentProduct.origin || 'Local';
            document.getElementById('product-shelf-life').textContent = this.currentProduct.shelfLife || 'N/A';
            document.getElementById('product-organic').textContent = this.currentProduct.organic ? 'Yes' : 'No';
            document.getElementById('product-availability').textContent = this.currentProduct.status === 'active' ? 'In Stock' : 'Out of Stock';
            document.getElementById('product-availability').className = this.currentProduct.status === 'active' ? 'text-success' : 'text-danger';

            // Update features
            const featuresList = document.getElementById('product-features-list');
            if (featuresList && this.currentProduct.features) {
                featuresList.innerHTML = '';
                this.currentProduct.features.forEach(feature => {
                    const li = document.createElement('li');
                    li.textContent = feature;
                    featuresList.appendChild(li);
                });
            }

            // Update tabs content
            const detailsContent = document.getElementById('product-details-content');
            const nutritionContent = document.getElementById('nutrition-info-content');
            const storageContent = document.getElementById('storage-tips-content');
            
            if (detailsContent) detailsContent.innerHTML = this.generateProductDetails();
            if (nutritionContent) nutritionContent.innerHTML = this.currentProduct.nutrition || '<p>Nutrition information not available.</p>';
            if (storageContent) storageContent.innerHTML = this.currentProduct.storage || '<p>Storage information not available.</p>';

            // Update images
            this.loadProductImages();
            
            // Update page title
            document.title = `${this.currentProduct.name} - FarmFresh`;
        } catch (error) {
            console.error('Error displaying product details:', error);
            this.showError('Failed to display product details');
        }
    }

    // Update loadProductImages method to handle multiple images
    loadProductImages() {
        try {
            const swiperWrapper = document.querySelector('.swiper-wrapper');
            if (swiperWrapper) {
                swiperWrapper.innerHTML = '';
                
                // Get all images or use main image as fallback
                const productImages = this.currentProduct.images && this.currentProduct.images.length > 0 
                    ? this.currentProduct.images 
                    : [this.currentProduct.image || 'assets/img/placeholder.jpg'];
                
                // Create slides for each image
                productImages.forEach((imageSrc, index) => {
                    const slide = document.createElement('div');
                    slide.className = 'swiper-slide';
                    slide.innerHTML = `
                        <div class="product-detail-image-container">
                            <img src="${imageSrc}" 
                                 class="product-detail-image" 
                                 alt="${this.currentProduct.name} - Image ${index + 1}"
                                 onerror="this.src='assets/img/placeholder.jpg'">
                        </div>
                    `;
                    swiperWrapper.appendChild(slide);
                });
                
                // Reinitialize swiper with multiple images
                this.initializeSwiper();
            }
        } catch (error) {
            console.error('Error loading product images:', error);
            // Fallback to single image
            this.loadSingleImage();
        }
    }

    // Fallback method for single image
    loadSingleImage() {
        try {
            const swiperWrapper = document.querySelector('.swiper-wrapper');
            if (swiperWrapper) {
                const mainImage = this.currentProduct.image || 
                                (this.currentProduct.images && this.currentProduct.images[0]) || 
                                'assets/img/placeholder.jpg';
                
                swiperWrapper.innerHTML = `
                    <div class="swiper-slide">
                        <div class="product-detail-image-container">
                            <img src="${mainImage}" 
                                 class="product-detail-image" 
                                 alt="${this.currentProduct.name}"
                                 onerror="this.src='assets/img/placeholder.jpg'">
                        </div>
                    </div>
                `;
                
                // Reinitialize swiper for single image
                this.initializeSwiper();
            }
        } catch (error) {
            console.error('Error loading single image:', error);
        }
    }

    // Update initializeSwiper to handle multiple images properly
    initializeSwiper() {
        try {
            if (typeof Swiper !== 'undefined') {
                const swiperContainer = document.querySelector('.product-details-slider');
                if (!swiperContainer) return;

                // Destroy existing swiper instance if any
                if (swiperContainer.swiper) {
                    swiperContainer.swiper.destroy();
                }

                // Get number of images
                const slideCount = document.querySelectorAll('.swiper-slide').length;
                
                const swiperConfig = {
                    loop: slideCount > 1,
                    speed: 600,
                    autoplay: slideCount > 1 ? { delay: 5000 } : false,
                    slidesPerView: 1,
                    spaceBetween: 0,
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev'
                    },
                    pagination: {
                        el: '.swiper-pagination',
                        type: 'bullets',
                        clickable: true
                    },
                    effect: slideCount > 1 ? 'slide' : 'fade',
                    fadeEffect: {
                        crossFade: true
                    }
                };

                // Hide navigation and pagination if only one image
                if (slideCount <= 1) {
                    swiperConfig.navigation = false;
                    swiperConfig.pagination = false;
                }

                new Swiper('.product-details-slider', swiperConfig);

                // Hide navigation elements if only one image
                if (slideCount <= 1) {
                    const prevBtn = document.querySelector('.swiper-button-prev');
                    const nextBtn = document.querySelector('.swiper-button-next');
                    const pagination = document.querySelector('.swiper-pagination');
                    
                    if (prevBtn) prevBtn.style.display = 'none';
                    if (nextBtn) nextBtn.style.display = 'none';
                    if (pagination) pagination.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error initializing swiper:', error);
        }
    }

    generateProductDetails() {
        return `
            <div class="product-specs">
                <h4>Product Specifications</h4>
                <div class="row">
                    <div class="col-md-6">
                        <ul class="list-unstyled">
                            <li><strong>Category:</strong> ${this.formatCategory(this.currentProduct.category)}</li>
                            <li><strong>Weight:</strong> ${this.currentProduct.details?.weight || this.currentProduct.weight || 'N/A'}</li>
                            <li><strong>Origin:</strong> ${this.currentProduct.details?.origin || this.currentProduct.origin || 'Local'}</li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <ul class="list-unstyled">
                            <li><strong>Organic:</strong> ${this.currentProduct.organic ? 'Yes' : 'No'}</li>
                            <li><strong>Shelf Life:</strong> ${this.currentProduct.shelfLife || 'N/A'}</li>
                            <li><strong>Status:</strong> ${this.currentProduct.status || 'active'}</li>
                        </ul>
                    </div>
                </div>
                <p class="mt-3">${this.currentProduct.description || 'No description available'}</p>
            </div>
        `;
    }

    setupEventListeners() {
        // Quantity controls
        const minusBtn = document.querySelector('.quantity-minus');
        const plusBtn = document.querySelector('.quantity-plus');
        const quantityInput = document.querySelector('.quantity-input');

        if (minusBtn && plusBtn && quantityInput) {
            minusBtn.addEventListener('click', () => {
                let value = parseInt(quantityInput.value);
                if (value > 1) {
                    quantityInput.value = value - 1;
                }
            });

            plusBtn.addEventListener('click', () => {
                let value = parseInt(quantityInput.value);
                if (value < 100) {
                    quantityInput.value = value + 1;
                }
            });

            // Input validation
            quantityInput.addEventListener('change', () => {
                let value = parseInt(quantityInput.value);
                if (isNaN(value) || value < 1) {
                    quantityInput.value = 1;
                } else if (value > 100) {
                    quantityInput.value = 100;
                }
            });
        }

        // Add to cart button
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                this.addToCart();
            });
        }
    }

    addToCart() {
        try {
            const quantityInput = document.querySelector('.quantity-input');
            const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
            
            if (!this.currentProduct) {
                this.showCartNotification('Product not loaded', true);
                return;
            }

            console.log('Attempting to add to cart:', {
                productId: this.currentProduct.id,
                productName: this.currentProduct.name,
                quantity: quantity,
                price: this.currentProduct.price
            });

            // Use the centralized CartManager
            if (window.cartManager && window.cartManager.addItem) {
                const success = window.cartManager.addItem(this.currentProduct.id, quantity);
                if (success) {
                    this.showCartNotification(`${this.currentProduct.name} (${quantity}) added to cart`);
                } else {
                    this.showCartNotification('Failed to add item to cart', true);
                    // Fallback to localStorage cart
                    this.fallbackAddToCart(quantity);
                }
            } else {
                console.error('Cart manager not available or missing addItem method');
                this.showCartNotification('Cart system not available', true);
                // Fallback: use local storage directly with proper data structure
                this.fallbackAddToCart(quantity);
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showCartNotification('Failed to add item to cart', true);
        }
    }

    // Fallback method if cart manager fails - FIXED DATA STRUCTURE
    fallbackAddToCart(quantity) {
        try {
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const existingItemIndex = cart.findIndex(item => item.id === this.currentProduct.id);
            
            // Ensure all required properties exist with fallbacks
            const cartItem = {
                id: this.currentProduct.id,
                name: this.currentProduct.name || 'Unknown Product',
                price: this.currentProduct.price || 0,
                image: this.currentProduct.image || 
                      (this.currentProduct.images && this.currentProduct.images[0]) || 
                      'assets/img/placeholder.jpg',
                category: this.currentProduct.category || 'uncategorized',
                weight: this.currentProduct.details?.weight || this.currentProduct.weight || 'N/A',
                quantity: quantity
            };
            
            if (existingItemIndex !== -1) {
                cart[existingItemIndex].quantity += quantity;
            } else {
                cart.push(cartItem);
            }
            
            localStorage.setItem('cart', JSON.stringify(cart));
            this.showCartNotification(`${this.currentProduct.name} (${quantity}) added to cart`);
            
            // Update cart count
            this.updateCartCount();
            
            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('cartUpdated', {
                detail: { cart: cart }
            }));
        } catch (error) {
            console.error('Fallback add to cart failed:', error);
            this.showCartNotification('Failed to add item to cart', true);
        }
    }

    updateCartCount() {
        try {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const cartCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            
            // Update cart count in header if exists
            const cartCountElements = document.querySelectorAll('.cart-count, .cart-counter');
            cartCountElements.forEach(element => {
                element.textContent = cartCount;
                element.style.display = cartCount > 0 ? 'flex' : 'none';
            });
        } catch (error) {
            console.error('Error updating cart count:', error);
        }
    }

    showCartNotification(message, isError = false) {
        try {
            // Try to use cart manager's notification system first
            if (window.cartManager && window.cartManager.showNotification) {
                window.cartManager.showNotification(message, isError ? 'error' : 'success');
                return;
            }

            // Fallback notification system
            let notification = document.getElementById('cart-notification');
            if (!notification) {
                // Create notification element if it doesn't exist
                notification = document.createElement('div');
                notification.id = 'cart-notification';
                notification.className = 'cart-notification';
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transform: translateX(400px);
                    opacity: 0;
                    transition: all 0.3s ease;
                `;
                document.body.appendChild(notification);
            }

            notification.innerHTML = `
                <i class="bi ${isError ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}"></i>
                <span class="notification-text">${message}</span>
            `;
            
            notification.style.backgroundColor = isError ? '#dc3545' : '#28a745';
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
            
            setTimeout(() => {
                notification.style.transform = 'translateX(400px)';
                notification.style.opacity = '0';
            }, 3000);
        } catch (error) {
            console.error('Error showing cart notification:', error);
            // Final fallback to alert
            alert(message);
        }
    }

    showError(message) {
        try {
            const container = document.querySelector('.product-details .container');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger text-center">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        ${message}
                        <br>
                        <a href="product.html" class="btn btn-primary mt-3">Back to Products</a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error showing error message:', error);
        }
    }

    formatCategory(category) {
        return category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Uncategorized';
    }
}

// Initialize product details when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing ProductDetails...');
    window.productDetails = new ProductDetails();
});