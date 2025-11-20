// Owner Product Management with IndexedDB - Enhanced with Farm Tracking
class OwnerProductManager {
    constructor() {
        this.dbName = 'FarmMarketDB';
        this.dbVersion = 4;
        this.storeName = 'products';
        this.db = null;
        this.ownerData = null;
        this.currentFarm = null;
        this.init();
    }

    async init() {
        await this.openDatabase();
        this.checkAuthentication();
        this.loadOwnerData();
        this.setupEventListeners();
        this.loadOwnerProducts();
        this.updateProductStats();
        
        // Refresh dashboard when products are loaded/updated
        this.refreshDashboard();
    }

    // Open IndexedDB database
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create products store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('farmId', 'farmId', { unique: false });
                } else {
                    // Upgrade existing database
                    const transaction = event.target.transaction;
                    const store = transaction.objectStore(this.storeName);
                    
                    // Create farmId index if it doesn't exist
                    if (!store.indexNames.contains('farmId')) {
                        store.createIndex('farmId', 'farmId', { unique: false });
                    }
                }
            };
        });
    }

    checkAuthentication() {
        const ownerData = localStorage.getItem('farmOwnerData');
        
        if (!ownerData) {
            alert('Please sign up first to access the owner dashboard.');
            window.location.href = '../auth/owner-signup.html';
            return;
        }

        this.ownerData = JSON.parse(ownerData);
        
        if (!this.ownerData.isLoggedIn) {
            alert('Please login to access your dashboard.');
            window.location.href = '../auth/owner-login.html';
            return;
        }

        this.currentFarm = this.ownerData;
    }

    loadOwnerData() {
        if (this.ownerData) {
            // Update farm name in sidebar - safely check if element exists
            const farmNameElement = document.getElementById('farm-name');
            if (farmNameElement) {
                farmNameElement.textContent = this.ownerData.farm.name;
            }
            
            // Update farm name in header if exists
            const headerFarmName = document.getElementById('header-farm-name');
            if (headerFarmName) {
                headerFarmName.textContent = this.ownerData.farm.name;
            }

            // Update owner name if exists
            const ownerNameElement = document.getElementById('owner-name');
            if (ownerNameElement) {
                ownerNameElement.textContent = `${this.ownerData.owner.firstName} ${this.ownerData.owner.lastName}`;
            }
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('owner-product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProducts(e.target.value);
            });
        }

        // Add product form submission
        const addProductForm = document.getElementById('add-owner-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNewProduct();
            });
        }

        // Image upload setup for add product page
        if (window.location.pathname.includes('add-product.html')) {
            this.setupImageUpload();
        }
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('image-upload-area');
        const fileInput = document.getElementById('product-images');
        const imagePreview = document.getElementById('image-preview');

        if (!uploadArea || !fileInput || !imagePreview) return;

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            this.handleMultipleImageUpload(files, imagePreview, uploadArea);
        });
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleMultipleImageUpload(files, imagePreview, uploadArea);
        });
    }

    handleMultipleImageUpload(files, imagePreview, uploadArea) {
        const currentImages = imagePreview.querySelectorAll('.image-preview-item').length;
        
        if (currentImages + files.length > 6) {
            alert('Maximum 6 images allowed. Please select fewer images.');
            return;
        }

        files.forEach(file => {
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload(file, imagePreview, uploadArea);
            }
        });
    }

    handleImageUpload(file, imagePreview, uploadArea) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.addImageToPreview(e.target.result, imagePreview, uploadArea);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    addImageToPreview(imageSrc, imagePreview, uploadArea) {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `
            <img src="${imageSrc}" alt="Preview">
            <button type="button" class="remove-image" onclick="ownerProductManager.removeImagePreview(this)">
                <i class="bi bi-x"></i>
            </button>
        `;
        imagePreview.appendChild(previewItem);
        
        const totalImages = imagePreview.querySelectorAll('.image-preview-item').length;
        if (totalImages >= 6) {
            uploadArea.style.display = 'none';
        }
    }

    removeImagePreview(button) {
        const previewItem = button.closest('.image-preview-item');
        previewItem.remove();
        const uploadArea = document.getElementById('image-upload-area');
        if (uploadArea) {
            uploadArea.style.display = 'block';
        }
    }

    // Add new product (Owner functionality)
    async addNewProduct() {
        // Get form values
        const name = document.getElementById('product-name').value;
        const description = document.getElementById('product-description').value;
        const category = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const weight = document.getElementById('product-weight').value;
        const origin = document.getElementById('product-origin').value;
        const stock = parseInt(document.getElementById('product-stock').value);
        const organic = document.getElementById('product-organic').checked;
        const shelfLife = document.getElementById('product-shelf-life').value;
        const featuresText = document.getElementById('product-features').value;
        const features = featuresText ? featuresText.split('\n').filter(f => f.trim()) : [];

        // Get images from preview
        const imagePreview = document.getElementById('image-preview');
        const imageItems = imagePreview.querySelectorAll('.image-preview-item img');
        const images = Array.from(imageItems).map(img => img.src);

        // Validation
        if (!name || !description || !category || !price || isNaN(price) || !weight || !origin || isNaN(stock) || !shelfLife) {
            alert('Please fill in all required fields with valid data.');
            return;
        }

        if (images.length === 0) {
            alert('Please upload at least one product image.');
            return;
        }

        // Create product object with farm information
        const newProduct = {
            id: this.generateProductId(),
            name: name,
            category: category,
            price: price,
            images: images,
            image: images[0], // First image as main image
            details: {
                weight: weight,
                origin: origin
            },
            description: description,
            status: 'pending', // Pending admin approval
            organic: organic,
            shelfLife: shelfLife,
            features: features,
            stock: stock,
            farmId: this.ownerData.id, // Include farm ID
            farmName: this.ownerData.farm.name, // Include farm name
            submittedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            createdBy: 'owner'
        };

        try {
            await this.saveOwnerProduct(newProduct);
            alert('Product submitted successfully! It will be reviewed by admin before appearing on the site.');
            
            // Refresh dashboard data
            this.refreshDashboard();
            
            // Redirect to products page
            window.location.href = 'products.html';
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Error adding product. Please try again.');
        }
    }

    generateProductId() {
        return 'owner-product-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Save product to owner products (pending approval) in localStorage
    async saveOwnerProduct(product) {
        return new Promise((resolve, reject) => {
            try {
                // Get existing owner products
                const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
                
                // Add new product
                ownerProducts.push(product);
                
                // Save back to localStorage
                localStorage.setItem('ownerProducts', JSON.stringify(ownerProducts));
                
                resolve(product);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Get approved products from IndexedDB for this farm (FIXED VERSION)
    async getApprovedProductsFromDB() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                
                // Check if farmId index exists
                if (store.indexNames.contains('farmId')) {
                    const index = store.index('farmId');
                    const request = index.getAll(this.ownerData.id);

                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => {
                        const products = request.result.filter(product => 
                            product.status === 'approved' || product.status === 'active'
                        );
                        resolve(products);
                    };
                } else {
                    // If farmId index doesn't exist, get all products and filter manually
                    console.warn('farmId index not found, falling back to manual filtering');
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onerror = () => reject(getAllRequest.error);
                    getAllRequest.onsuccess = () => {
                        const products = getAllRequest.result.filter(product => 
                            product.farmId === this.ownerData.id && 
                            (product.status === 'approved' || product.status === 'active')
                        );
                        resolve(products);
                    };
                }
            } catch (error) {
                console.error('Error getting approved products:', error);
                resolve([]); // Return empty array instead of rejecting
            }
        });
    }

    // Load owner products for display (FIXED VERSION)
    async loadOwnerProducts() {
        const tableBody = document.getElementById('owner-products-table');
        if (!tableBody) return;

        try {
            // Get products for current farm
            const ownerProducts = this.getOwnerProducts();
            const approvedProducts = await this.getApprovedProductsFromDB();
            
            // Combine both lists
            const allProducts = [...ownerProducts, ...approvedProducts];

            if (allProducts.length === 0) {
                tableBody.innerHTML = this.getEmptyProductsHTML();
                return;
            }

            // Sort by date (newest first)
            allProducts.sort((a, b) => new Date(b.submittedDate || b.createdAt) - new Date(a.submittedDate || a.createdAt));

            tableBody.innerHTML = allProducts.map(product => `
                <tr>
                    <td>
                        <img src="${product.images && product.images.length > 0 ? product.images[0] : '../assets/img/placeholder.jpg'}" 
                             alt="${product.name}" class="product-thumbnail">
                    </td>
                    <td>${product.name}</td>
                    <td>
                        <span class="badge ${this.getCategoryBadgeClass(product.category)}">
                            ${this.formatCategory(product.category)}
                        </span>
                    </td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>${product.stock}</td>
                    <td>
                        <span class="badge ${this.getStatusBadgeClass(product.status)}">
                            ${this.formatStatus(product.status)}
                        </span>
                    </td>
                    <td>${this.formatDate(product.submittedDate || product.createdAt)}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            ${product.status === 'pending' || product.status === 'rejected' ? `
                                <button class="btn btn-outline-primary" onclick="ownerProductManager.editProduct('${product.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="ownerProductManager.deleteProduct('${product.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : `
                                <button class="btn btn-outline-primary" onclick="ownerProductManager.viewProduct('${product.id}')">
                                    <i class="bi bi-eye"></i>
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading owner products:', error);
            tableBody.innerHTML = this.getEmptyProductsHTML();
        }
    }

    // Get products from owner storage (pending/rejected)
    getOwnerProducts() {
        const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
        return ownerProducts.filter(product => product.farmId === this.ownerData.id);
    }

    // Get recent products for dashboard
    async getRecentProducts(limit = 5) {
        try {
            const ownerProducts = this.getOwnerProducts();
            const approvedProducts = await this.getApprovedProductsFromDB();
            const allProducts = [...ownerProducts, ...approvedProducts];
            
            return allProducts
                .sort((a, b) => new Date(b.submittedDate || b.createdAt) - new Date(a.submittedDate || a.createdAt))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting recent products:', error);
            return [];
        }
    }

    // Get product statistics
    async getProductStats() {
        try {
            const ownerProducts = this.getOwnerProducts();
            const approvedProducts = await this.getApprovedProductsFromDB();

            const totalProducts = ownerProducts.length + approvedProducts.length;
            const pendingProducts = ownerProducts.filter(p => p.status === 'pending').length;
            const approvedProductsCount = approvedProducts.length;
            const rejectedProducts = ownerProducts.filter(p => p.status === 'rejected').length;

            return {
                totalProducts,
                pendingProducts,
                approvedProductsCount,
                rejectedProducts
            };
        } catch (error) {
            console.error('Error getting product stats:', error);
            return {
                totalProducts: 0,
                pendingProducts: 0,
                approvedProductsCount: 0,
                rejectedProducts: 0
            };
        }
    }

    // Update product statistics (FIXED VERSION)
    async updateProductStats() {
        try {
            const stats = await this.getProductStats();

            // Update stats cards
            this.updateElement('farm-products', stats.totalProducts);
            this.updateElement('pending-products', stats.pendingProducts);
            this.updateElement('approved-products', stats.approvedProductsCount);
            this.updateElement('rejected-products', stats.rejectedProducts);
        } catch (error) {
            console.error('Error updating product stats:', error);
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Filter products (FIXED VERSION)
    async filterProducts(searchTerm) {
        try {
            const ownerProducts = this.getOwnerProducts();
            const approvedProducts = await this.getApprovedProductsFromDB();
            const allProducts = [...ownerProducts, ...approvedProducts];

            const filteredProducts = allProducts.filter(product => 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const tableBody = document.getElementById('owner-products-table');
            if (!tableBody) return;

            if (filteredProducts.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4">
                            <i class="bi bi-search display-4 d-block text-muted mb-2"></i>
                            <p class="text-muted">No products match your search</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = filteredProducts.map(product => `
                <tr>
                    <td>
                        <img src="${product.images && product.images.length > 0 ? product.images[0] : '../assets/img/placeholder.jpg'}" 
                             alt="${product.name}" class="product-thumbnail">
                    </td>
                    <td>${product.name}</td>
                    <td>
                        <span class="badge ${this.getCategoryBadgeClass(product.category)}">
                            ${this.formatCategory(product.category)}
                        </span>
                    </td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>${product.stock}</td>
                    <td>
                        <span class="badge ${this.getStatusBadgeClass(product.status)}">
                            ${this.formatStatus(product.status)}
                        </span>
                    </td>
                    <td>${this.formatDate(product.submittedDate || product.createdAt)}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            ${product.status === 'pending' || product.status === 'rejected' ? `
                                <button class="btn btn-outline-primary" onclick="ownerProductManager.editProduct('${product.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="ownerProductManager.deleteProduct('${product.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : `
                                <button class="btn btn-outline-primary" onclick="ownerProductManager.viewProduct('${product.id}')">
                                    <i class="bi bi-eye"></i>
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error filtering products:', error);
        }
    }

    // Edit product (only for pending/rejected products)
    editProduct(productId) {
        // Find product in owner products
        const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
        const product = ownerProducts.find(p => p.id === productId && p.farmId === this.ownerData.id);
        
        if (!product) {
            alert('Product not found or cannot be edited.');
            return;
        }

        // Redirect to edit page or open modal
        alert('Edit functionality would open here. For now, you can delete and recreate the product.');
        // You can implement a full edit modal similar to the admin one
    }

    // View product (read-only for approved products)
    viewProduct(productId) {
        // This would need to query the IndexedDB to view approved products
        alert('View product details functionality. Product ID: ' + productId);
    }

    // Delete product (FIXED VERSION)
    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            let deleted = false;

            // Remove from owner products (pending/rejected)
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            const updatedOwnerProducts = ownerProducts.filter(p => !(p.id === productId && p.farmId === this.ownerData.id));
            
            if (updatedOwnerProducts.length !== ownerProducts.length) {
                localStorage.setItem('ownerProducts', JSON.stringify(updatedOwnerProducts));
                deleted = true;
            }

            // Try to remove from IndexedDB (approved products)
            if (!deleted && this.db) {
                try {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.delete(productId);
                    
                    request.onsuccess = () => {
                        deleted = true;
                    };
                    
                    request.onerror = () => {
                        console.error('Error deleting from IndexedDB:', request.error);
                    };
                } catch (error) {
                    console.error('Error with IndexedDB transaction:', error);
                }
            }

            // Refresh display and dashboard
            await this.loadOwnerProducts();
            await this.updateProductStats();
            this.refreshDashboard();
            
            if (deleted) {
                alert('Product deleted successfully!');
            } else {
                alert('Product not found.');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product. Please try again.');
        }
    }

    // Refresh dashboard data
    refreshDashboard() {
        if (window.ownerDashboard) {
            window.ownerDashboard.refreshDashboardData();
        }
    }

    // Helper methods
    getCategoryBadgeClass(category) {
        const colors = {
            fruit: 'bg-success',
            vegetable: 'bg-info',
            seed: 'bg-primary',
            meat: 'bg-danger',
            equipment: 'bg-warning',
            dairy: 'bg-secondary',
            grains: 'bg-dark'
        };
        return colors[category] || 'bg-secondary';
    }

    getStatusBadgeClass(status) {
        const statusMap = {
            'active': 'bg-success',
            'approved': 'bg-success',
            'pending': 'bg-warning',
            'rejected': 'bg-danger',
            'inactive': 'bg-secondary'
        };
        return statusMap[status.toLowerCase()] || 'bg-secondary';
    }

    formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    formatStatus(status) {
        const statusMap = {
            'active': 'Active',
            'approved': 'Approved',
            'pending': 'Pending Review',
            'rejected': 'Rejected',
            'inactive': 'Inactive'
        };
        return statusMap[status.toLowerCase()] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getEmptyProductsHTML() {
        return `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="bi bi-inbox display-4 d-block text-muted mb-2"></i>
                    <p class="text-muted mb-2">No products yet</p>
                    <small class="text-muted d-block mb-3">Start by adding your first product</small>
                    <a href="add-product.html" class="btn btn-primary btn-sm">
                        <i class="bi bi-plus-circle me-1"></i>Add First Product
                    </a>
                </td>
            </tr>
        `;
    }
}

// Initialize owner product manager
const ownerProductManager = new OwnerProductManager();