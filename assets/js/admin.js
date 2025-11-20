// Admin Product Management with IndexedDB
class ProductManager {
    constructor() {
        this.dbName = 'FarmMarketDB';
        this.dbVersion = 4;
        this.storeName = 'products';
        this.db = null;
        this.products = [];
        this.currentEditProduct = null;
        this.init();
    }

    // Initialize database and load products
    async init() {
        await this.openDatabase();
        await this.loadProducts();
        
        if (window.location.pathname.includes('/admin/')) {
            // Remove the problematic line that calls non-existent method
            this.setupEventListeners();
            this.setupEditModal();
            this.removeAddProductButton();
            this.updateDashboardStats();
            this.loadRecentProducts();
            
            if (window.location.pathname.includes('products.html')) {
                this.loadOwnerProductsForApproval();
            }
        }
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
                const oldVersion = event.oldVersion || 0;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('farmId', 'farmId', { unique: false });
                } else {
                    const transaction = event.target.transaction;
                    const store = transaction.objectStore(this.storeName);
                    
                    if (!store.indexNames.contains('farmId')) {
                        store.createIndex('farmId', 'farmId', { unique: false });
                    }
                }
                
                if (oldVersion < 1) {
                    this.addDefaultProducts(db);
                }
            };
        });
    }

    // Add default products during database creation
    async addDefaultProducts(db) {
        const defaultProducts = this.getDefaultProducts();
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        defaultProducts.forEach(product => {
            store.add(product);
        });
    }

    // Load all products from IndexedDB
    async loadProducts() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.products = request.result;
                resolve(this.products);
            };
        });
    }

    // Save products to IndexedDB
    async saveProducts() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            // Clear existing products
            const clearRequest = store.clear();

            clearRequest.onerror = () => reject(clearRequest.error);
            
            clearRequest.onsuccess = () => {
                // Add all current products
                const requests = this.products.map(product => 
                    new Promise((res, rej) => {
                        const addRequest = store.add(product);
                        addRequest.onsuccess = () => res();
                        addRequest.onerror = () => rej(addRequest.error);
                    })
                );

                Promise.all(requests).then(() => {
                    this.loadOwnerProductsForApproval();
                    this.updateDashboardStats();
                    this.loadRecentProducts();
                    resolve();
                }).catch(reject);
            };
        });
    }

    // APPROVE PRODUCT
    async approveProduct(productId) {
        if (!confirm('Are you sure you want to approve this product?')) return;

        try {
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            const productIndex = ownerProducts.findIndex(p => p.id === productId && p.status === 'pending');
            
            if (productIndex === -1) {
                alert('Product not found or already processed.');
                return;
            }

            const product = ownerProducts[productIndex];
            
            const approvedProduct = {
                ...product,
                status: 'active',
                approvedDate: new Date().toISOString(),
                approvedBy: 'admin',
                lastUpdated: new Date().toISOString(),
                image: product.images && product.images.length > 0 ? product.images[0] : 'assets/img/placeholder.jpg',
                details: product.details || {
                    weight: product.weight || 'N/A',
                    origin: product.origin || 'Local Farm'
                }
            };

            console.log('Approving product:', approvedProduct);

            await this.addProductToDB(approvedProduct);

            ownerProducts.splice(productIndex, 1);
            localStorage.setItem('ownerProducts', JSON.stringify(ownerProducts));

            this.loadOwnerProductsForApproval();
            
            if (window.productDisplay) {
                await window.productDisplay.refreshProducts();
            }
            
            alert('Product approved successfully! It is now live on the site.');
        } catch (error) {
            console.error('Error approving product:', error);
            alert('Error approving product. Please try again.');
        }
    }

    // Add a single product to IndexedDB
    async addProductToDB(product) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(product);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.products.push(product);
                resolve(product);
            };
        });
    }

    // Update a single product in IndexedDB
    async updateProductInDB(product) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(product);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const index = this.products.findIndex(p => p.id === product.id);
                if (index !== -1) {
                    this.products[index] = product;
                }
                resolve(product);
            };
        });
    }

    // Delete a product from IndexedDB
    async deleteProductFromDB(productId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(productId);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.products = this.products.filter(product => product.id !== productId);
                resolve();
            };
        });
    }

    getDefaultProducts() {
        return [
            {
                id: "fresh-apples",
                name: "Fresh Organic Apples",
                category: "fruit",
                price: 12.00,
                images: ["assets/img/products/product-1.jpg"],
                details: {
                    weight: "1kg",
                    origin: "Local"
                },
                description: "Fresh, crisp organic apples grown locally with no pesticides.",
                status: "active",
                organic: true,
                shelfLife: "2-3 weeks",
                features: [
                    '100% Organic Certified',
                    'Locally Grown',
                    'No Artificial Preservatives',
                    'Rich in Fiber and Vitamins'
                ],
                nutrition: '<p><strong>Nutrition Facts per 100g:</strong></p><ul><li>Calories: 52</li><li>Carbohydrates: 14g</li><li>Fiber: 2.4g</li><li>Vitamin C: 7% DV</li><li>Potassium: 107mg</li></ul>',
                storage: '<p>Store in a cool, dry place away from direct sunlight. For longer freshness, refrigerate in the crisper drawer. Keep separate from other fruits that produce ethylene gas.</p>'
            },
            {
                id: "organic-carrots",
                name: "Organic Carrots",
                category: "vegetable",
                price: 8.50,
                images: ["assets/img/products/product-2.jpg"],
                details: {
                    weight: "500g",
                    origin: "Local Farm"
                },
                description: "Fresh organic carrots, rich in beta-carotene and vitamins.",
                status: "active",
                organic: true,
                shelfLife: "3-4 weeks",
                features: [
                    '100% Organic',
                    'Rich in Vitamin A',
                    'Freshly Harvested',
                    'No Chemicals'
                ],
                nutrition: '<p><strong>Nutrition Facts per 100g:</strong></p><ul><li>Calories: 41</li><li>Carbohydrates: 10g</li><li>Fiber: 2.8g</li><li>Vitamin A: 334% DV</li><li>Vitamin K: 16% DV</li></ul>',
                storage: '<p>Store in refrigerator in plastic bag. Remove green tops before storage to prevent moisture loss.</p>'
            },
            {
                id: "tomato-seeds",
                name: "Heirloom Tomato Seeds",
                category: "seed",
                price: 4.99,
                images: ["assets/img/products/seeds-1.jpg"],
                details: {
                    weight: "50 seeds",
                    origin: "Certified Organic"
                },
                description: "Premium heirloom tomato seeds for your home garden. Non-GMO and organic.",
                status: "active",
                organic: true,
                shelfLife: "2 years",
                features: [
                    'Non-GMO Heirloom Variety',
                    '95% Germination Rate',
                    'Organic Certified',
                    'Open Pollinated'
                ],
                nutrition: '<p><strong>Growing Information:</strong></p><ul><li>Germination Time: 7-14 days</li><li>Days to Maturity: 75-85 days</li><li>Plant Spacing: 24-36 inches</li><li>Sun Requirements: Full Sun</li></ul>',
                storage: '<p>Store in a cool, dry place in original packaging. For best results, plant within 2 years of purchase. Keep away from moisture and direct sunlight.</p>'
            }
        ];
    }

    // Completely remove add product functionality
    removeAddProductButton() {
        const addButton = document.getElementById('add-product-btn');
        if (addButton) {
            addButton.remove();
        }
        
        const addProductLinks = document.querySelectorAll('a[href*="add-product"], a[href*="addproduct"]');
        addProductLinks.forEach(link => {
            link.remove();
        });
        
        const addProductHeaders = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        addProductHeaders.forEach(header => {
            if (header.textContent.toLowerCase().includes('add new product') || 
                header.textContent.toLowerCase().includes('add product')) {
                header.remove();
            }
        });
        
        const addProductForms = document.querySelectorAll('form[action*="add-product"], form[action*="addproduct"]');
        addProductForms.forEach(form => {
            form.remove();
        });
        
        const addProductSections = document.querySelectorAll('.add-product-section, [class*="add-product"]');
        addProductSections.forEach(section => {
            section.remove();
        });
    }

    // LOAD OWNER PRODUCTS FOR ADMIN APPROVAL - FIXED VERSION
    async loadOwnerProductsForApproval() {
        const pendingProducts = this.getPendingProducts();
        const approvedProducts = this.getApprovedFarmProducts();
        const adminProducts = this.products.filter(p => !p.farmId); // Products without farmId are admin products
        
        // Update admin products table to show all products with their states
        this.loadAllProductsTable(pendingProducts, approvedProducts, adminProducts);
    }

    // GET PENDING PRODUCTS FROM OWNER
    getPendingProducts() {
        try {
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            return ownerProducts.filter(product => product.status === 'pending');
        } catch (error) {
            console.error('Error loading pending products:', error);
            return [];
        }
    }

    // GET APPROVED FARM PRODUCTS
    getApprovedFarmProducts() {
        try {
            return this.products.filter(product => product.farmId && (product.status === 'active' || product.status === 'approved'));
        } catch (error) {
            console.error('Error loading farm products:', error);
            return [];
        }
    }

    // LOAD ALL PRODUCTS TABLE WITH STATES - FIXED VERSION
    loadAllProductsTable(pendingProducts, approvedProducts, adminProducts) {
        const tableBody = document.getElementById('products-table');
        if (!tableBody) return;

        // Combine all products - admin products + approved farm products + pending products
        const allProducts = [...adminProducts, ...approvedProducts, ...pendingProducts];
        
        // Remove duplicates based on ID
        const uniqueProducts = allProducts.filter((product, index, self) =>
            index === self.findIndex(p => p.id === product.id)
        );

        tableBody.innerHTML = '';

        if (uniqueProducts.length === 0) {
            tableBody.innerHTML = this.getEmptyProductsHTML();
            return;
        }

        // Sort by status (pending first) and date
        uniqueProducts.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return new Date(b.submittedDate || b.createdAt) - new Date(a.submittedDate || a.createdAt);
        });

        uniqueProducts.forEach(product => {
            const firstImage = product.images && product.images.length > 0 ? product.images[0] : 'assets/img/placeholder.jpg';
            const row = document.createElement('tr');
            
            // Different row styling based on status
            if (product.status === 'pending') {
                row.classList.add('table-warning');
            } else if (product.status === 'rejected') {
                row.classList.add('table-danger');
            }
            
            // Determine product source
            let productSource = 'Admin';
            let sourceBadge = '<span class="badge bg-primary">Admin</span>';
            
            if (product.farmId) {
                productSource = product.farmName || 'Farm Owner';
                sourceBadge = `<span class="badge bg-info">${product.farmName || 'Farm'}</span>`;
            }
            
            row.innerHTML = `
                <td>
                    <div class="form-check">
                        <input class="form-check-input product-checkbox" type="checkbox" value="${product.id}">
                    </div>
                </td>
                <td>
                    <img src="${firstImage}" alt="${product.name}" class="product-thumbnail rounded">
                </td>
                <td>
                    <div class="d-flex flex-column">
                        <strong>${product.name}</strong>
                        <small class="text-muted">${product.description.substring(0, 50)}...</small>
                    </div>
                </td>
                <td>${sourceBadge}</td>
                <td>
                    <span class="badge bg-${this.getCategoryBadgeColor(product.category)}">
                        ${this.formatCategory(product.category)}
                    </span>
                </td>
                <td><strong>$${product.price.toFixed(2)}</strong></td>
                <td>
                    <span class="badge ${this.getProductStatusBadge(product.status)}">
                        ${this.formatProductStatus(product.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${product.status === 'pending' ? `
                            <button class="btn btn-outline-success" onclick="productManager.approveProduct('${product.id}')" title="Approve">
                                <i class="bi bi-check-lg"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="productManager.rejectProduct('${product.id}')" title="Reject">
                                <i class="bi bi-x-lg"></i>
                            </button>
                            <button class="btn btn-outline-primary" onclick="productManager.viewProductDetails('${product.id}')" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                        ` : `
                            <button class="btn btn-outline-primary" onclick="productManager.editProduct('${product.id}')" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="productManager.deleteProduct('${product.id}')" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="productManager.viewProductDetails('${product.id}')" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                        `}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Setup checkbox functionality
        this.setupBulkActions();
    }

    // Setup bulk actions functionality
    setupBulkActions() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.product-checkbox');
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');

        if (selectAll && checkboxes.length > 0) {
            selectAll.addEventListener('change', (e) => {
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
                this.updateBulkActions();
            });

            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.updateBulkActions();
                });
            });
        }

        this.updateBulkActions();
    }

    // Update bulk actions visibility
    updateBulkActions() {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        const selectAll = document.getElementById('select-all');

        if (!bulkActions || !selectedCount) return;

        const selected = Array.from(checkboxes).filter(cb => cb.checked);
        
        if (selected.length > 0) {
            bulkActions.classList.remove('d-none');
            selectedCount.textContent = selected.length;
        } else {
            bulkActions.classList.add('d-none');
        }

        // Update select all checkbox state
        if (selectAll && checkboxes.length > 0) {
            selectAll.checked = selected.length === checkboxes.length;
            selectAll.indeterminate = selected.length > 0 && selected.length < checkboxes.length;
        }
    }

    // REJECT PRODUCT
    async rejectProduct(productId) {
        const reason = prompt('Please enter rejection reason:');
        if (reason === null) return;

        if (!reason.trim()) {
            alert('Please provide a rejection reason.');
            return;
        }

        try {
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            const productIndex = ownerProducts.findIndex(p => p.id === productId && p.status === 'pending');
            
            if (productIndex === -1) {
                alert('Product not found or already processed.');
                return;
            }

            ownerProducts[productIndex].status = 'rejected';
            ownerProducts[productIndex].rejectionReason = reason.trim();
            ownerProducts[productIndex].lastUpdated = new Date().toISOString();

            localStorage.setItem('ownerProducts', JSON.stringify(ownerProducts));

            this.loadOwnerProductsForApproval();
            
            alert('Product rejected successfully!');
        } catch (error) {
            console.error('Error rejecting product:', error);
            alert('Error rejecting product. Please try again.');
        }
    }

    // VIEW PRODUCT DETAILS
    viewProductDetails(productId) {
        const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
        const allProducts = [...ownerProducts, ...this.products];
        
        const product = allProducts.find(p => p.id === productId);
        
        if (!product) {
            alert('Product not found.');
            return;
        }

        const details = `
Product Details:
---------------
Name: ${product.name}
Description: ${product.description}
Category: ${this.formatCategory(product.category)}
Price: $${product.price}
Weight: ${product.details?.weight || 'N/A'}
Origin: ${product.details?.origin || 'N/A'}
Farm: ${product.farmName || 'Admin'}
Status: ${this.formatProductStatus(product.status)}
Organic: ${product.organic ? 'Yes' : 'No'}
Shelf Life: ${product.shelfLife || 'N/A'}
Stock: ${product.stock || 'N/A'}
Submitted: ${product.submittedDate ? new Date(product.submittedDate).toLocaleDateString() : 'N/A'}
${product.rejectionReason ? `Rejection Reason: ${product.rejectionReason}` : ''}
        `.trim();

        alert(details);
    }

    // GET PRODUCT STATUS BADGE
    getProductStatusBadge(status) {
        const statusMap = {
            'active': 'bg-success',
            'approved': 'bg-success',
            'pending': 'bg-warning',
            'rejected': 'bg-danger',
            'inactive': 'bg-secondary'
        };
        return statusMap[status.toLowerCase()] || 'bg-secondary';
    }

    // FORMAT PRODUCT STATUS
    formatProductStatus(status) {
        const statusMap = {
            'active': 'Active',
            'approved': 'Approved',
            'pending': 'Pending Review',
            'rejected': 'Rejected',
            'inactive': 'Inactive'
        };
        return statusMap[status.toLowerCase()] || status;
    }

    // DELETE PRODUCT
    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            let deleted = false;

            // Check in owner products
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            const ownerIndex = ownerProducts.findIndex(p => p.id === productId);
            if (ownerIndex !== -1) {
                ownerProducts.splice(ownerIndex, 1);
                localStorage.setItem('ownerProducts', JSON.stringify(ownerProducts));
                deleted = true;
            }

            // Check in main database
            try {
                await this.deleteProductFromDB(productId);
                deleted = true;
            } catch (error) {
                console.log('Product not found in main database:', error);
            }

            if (deleted) {
                this.loadOwnerProductsForApproval();
                alert('Product deleted successfully!');
            } else {
                alert('Product not found.');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product. Please try again.');
        }
    }

    // BULK DELETE PRODUCTS
    async bulkDelete() {
        const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Please select at least one product to delete.');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedCheckboxes.length} products?`)) {
            return;
        }

        const productIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        try {
            for (const productId of productIds) {
                await this.deleteProduct(productId);
            }
            
            this.loadOwnerProductsForApproval();
            alert(`${productIds.length} products deleted successfully!`);
        } catch (error) {
            console.error('Error in bulk delete:', error);
            alert('Error deleting products. Please try again.');
        }
    }

    // BULK UPDATE STATUS
    async bulkUpdateStatus(status) {
        const selectedCheckboxes = document.querySelectorAll('.product-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Please select at least one product to update.');
            return;
        }

        const productIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        try {
            for (const productId of productIds) {
                const product = this.products.find(p => p.id === productId);
                if (product) {
                    product.status = status;
                    await this.updateProductInDB(product);
                }
            }
            
            this.loadOwnerProductsForApproval();
            alert(`${productIds.length} products updated to ${status} status!`);
        } catch (error) {
            console.error('Error in bulk update:', error);
            alert('Error updating products. Please try again.');
        }
    }

    // Update product method
    async updateProduct() {
        if (!this.currentEditProduct) return;

        const name = document.getElementById('edit-product-name').value;
        const description = document.getElementById('edit-product-description').value;
        const category = document.getElementById('edit-product-category').value;
        const price = parseFloat(document.getElementById('edit-product-price').value);
        const weight = document.getElementById('edit-product-weight').value;
        const origin = document.getElementById('edit-product-origin').value;
        const featuresText = document.getElementById('edit-product-features').value;
        const features = featuresText ? featuresText.split('\n').filter(f => f.trim()) : [];
        const status = document.getElementById('edit-product-status').value;
        const organic = document.getElementById('edit-product-organic').checked;
        const shelfLife = document.getElementById('edit-product-shelf-life').value;

        // Get ALL images from preview
        const imagePreview = document.getElementById('edit-image-preview');
        const imageItems = imagePreview.querySelectorAll('.image-preview-item img');
        const images = Array.from(imageItems).map(img => img.src);

        // Validate required fields
        if (!name || !description || !category || !price || isNaN(price)) {
            alert('Please fill in all required fields with valid data');
            return;
        }

        if (images.length === 0) {
            alert('Please upload at least one product image');
            return;
        }

        // Update product
        const updatedProduct = {
            ...this.currentEditProduct,
            name: name,
            category: category,
            price: price,
            images: images,
            image: images[0],
            details: {
                weight: weight,
                origin: origin
            },
            description: description,
            status: status,
            organic: organic,
            shelfLife: shelfLife,
            features: features
        };

        try {
            await this.updateProductInDB(updatedProduct);
            this.closeEditModal();
            this.loadOwnerProductsForApproval();
            alert('Product updated successfully!');
        } catch (error) {
            console.error('Error updating product:', error);
            alert('Error updating product. Please try again.');
        }
    }

    // Setup edit modal
    setupEditModal() {
        const modalHTML = `
            <div class="edit-modal" id="edit-product-modal">
                <div class="edit-modal-content">
                    <div class="edit-modal-header">
                        <h4 class="mb-0">Edit Product</h4>
                        <button class="close-modal" onclick="productManager.closeEditModal()">&times;</button>
                    </div>
                    <div class="edit-modal-body">
                        <form id="edit-product-form">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="edit-product-name" class="form-label">Product Name *</label>
                                        <input type="text" class="form-control" id="edit-product-name" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="edit-product-category" class="form-label">Category *</label>
                                        <select class="form-control" id="edit-product-category" required>
                                            <option value="fruit">Fruit</option>
                                            <option value="vegetable">Vegetable</option>
                                            <option value="seed">Seeds</option>
                                            <option value="meat">Meat</option>
                                            <option value="equipment">Equipment</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="edit-product-price" class="form-label">Price ($) *</label>
                                        <input type="number" class="form-control" id="edit-product-price" step="0.01" min="0" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="edit-product-status" class="form-label">Status</label>
                                        <select class="form-control" id="edit-product-status">
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="edit-product-description" class="form-label">Description *</label>
                                <textarea class="form-control" id="edit-product-description" rows="3" required></textarea>
                            </div>

                            <div class="image-upload-container">
                                <label class="form-label">Product Images (Max 6)</label>
                                <div class="upload-area" id="edit-image-upload-area">
                                    <i class="bi bi-cloud-upload display-4 text-muted d-block mb-2"></i>
                                    <p class="mb-1">Click to upload or drag and drop</p>
                                    <small class="upload-info">PNG, JPG, GIF up to 5MB each</small>
                                    <input type="file" id="edit-product-images" multiple accept="image/*" style="display: none;">
                                </div>
                                <div class="image-preview-grid" id="edit-image-preview"></div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="edit-product-weight" class="form-label">Weight/Package</label>
                                        <input type="text" class="form-control" id="edit-product-weight">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="edit-product-origin" class="form-label">Origin</label>
                                        <input type="text" class="form-control" id="edit-product-origin">
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label for="edit-product-shelf-life" class="form-label">Shelf Life</label>
                                        <input type="text" class="form-control" id="edit-product-shelf-life">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3 form-check" style="margin-top: 2rem;">
                                        <input type="checkbox" class="form-check-input" id="edit-product-organic">
                                        <label class="form-check-label" for="edit-product-organic">Organic Product</label>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label for="edit-product-features" class="form-label">Features (one per line)</label>
                                <textarea class="form-control" id="edit-product-features" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="edit-modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="productManager.closeEditModal()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="productManager.updateProduct()">Update Product</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupEditImageUpload();
    }

    // Image upload methods
    setupEditImageUpload() {
        const uploadArea = document.getElementById('edit-image-upload-area');
        const fileInput = document.getElementById('edit-product-images');
        const imagePreview = document.getElementById('edit-image-preview');

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
            <button type="button" class="remove-image" onclick="productManager.removeImagePreview(this)">
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
        const uploadArea = document.getElementById('edit-image-upload-area');
        if (uploadArea) {
            uploadArea.style.display = 'block';
        }
    }

    // Open edit modal
    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.currentEditProduct = product;

        // Fill form with product data
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-category').value = product.category;
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-status').value = product.status;
        document.getElementById('edit-product-description').value = product.description;
        document.getElementById('edit-product-weight').value = product.details.weight || '';
        document.getElementById('edit-product-origin').value = product.details.origin || '';
        document.getElementById('edit-product-shelf-life').value = product.shelfLife || '';
        document.getElementById('edit-product-organic').checked = product.organic || false;
        document.getElementById('edit-product-features').value = product.features ? product.features.join('\n') : '';

        // Load existing images
        const imagePreview = document.getElementById('edit-image-preview');
        imagePreview.innerHTML = '';
        
        if (product.images && product.images.length > 0) {
            product.images.forEach(imageSrc => {
                this.addImageToPreview(imageSrc, imagePreview, document.getElementById('edit-image-upload-area'));
            });
        }

        document.getElementById('edit-product-modal').classList.add('show');
    }

    // Close edit modal
    closeEditModal() {
        document.getElementById('edit-product-modal').classList.remove('show');
        this.currentEditProduct = null;
    }

    // Setup event listeners
    setupEventListeners() {
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProducts(e.target.value);
            });
        }

        // Filter dropdown
        const filterItems = document.querySelectorAll('[data-filter]');
        filterItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = e.target.getAttribute('data-filter');
                this.applyFilter(filter);
            });
        });
    }

    // Apply filter to products
    applyFilter(filter) {
        const rows = document.querySelectorAll('#products-table tr');
        
        rows.forEach(row => {
            if (filter === 'all') {
                row.style.display = '';
            } else {
                const statusBadge = row.querySelector('.badge');
                if (statusBadge) {
                    const status = statusBadge.textContent.toLowerCase();
                    if (status.includes(filter)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            }
        });
    }

    filterProducts(searchTerm) {
        const rows = document.querySelectorAll('#products-table tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const productName = row.querySelector('td:nth-child(3) strong')?.textContent.toLowerCase() || '';
            const productDescription = row.querySelector('td:nth-child(3) small')?.textContent.toLowerCase() || '';
            const category = row.querySelector('td:nth-child(5) .badge')?.textContent.toLowerCase() || '';
            
            const matches = productName.includes(searchTerm.toLowerCase()) ||
                          productDescription.includes(searchTerm.toLowerCase()) ||
                          category.includes(searchTerm.toLowerCase());

            if (matches) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Show no results message if needed
        if (visibleCount === 0 && searchTerm) {
            this.showNoResultsMessage();
        }
    }

    showNoResultsMessage() {
        const tableBody = document.getElementById('products-table');
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="8" class="text-center py-4">
                <i class="bi bi-search display-4 d-block text-muted mb-2"></i>
                <p class="text-muted">No products match your search</p>
                <button class="btn btn-outline-primary btn-sm" onclick="productManager.clearSearch()">
                    Clear Search
                </button>
            </td>
        `;
        tableBody.appendChild(noResultsRow);
    }

    clearSearch() {
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.value = '';
        }
        this.loadOwnerProductsForApproval();
    }

    // Load recent products for dashboard
    loadRecentProducts() {
        const tableBody = document.getElementById('recent-products-table');
        if (!tableBody) return;

        const recentProducts = [...this.products]
            .sort((a, b) => b.id.localeCompare(a.id))
            .slice(0, 5);

        tableBody.innerHTML = '';

        if (recentProducts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <i class="bi bi-inbox display-4 d-block text-muted mb-2"></i>
                        <p class="text-muted">No products found</p>
                    </td>
                </tr>
            `;
            return;
        }

        recentProducts.forEach(product => {
            const firstImage = product.images && product.images.length > 0 ? product.images[0] : 'assets/img/placeholder.jpg';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${firstImage}" alt="${product.name}" 
                             class="product-thumbnail-sm rounded me-3">
                        <span>${product.name}</span>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${this.getCategoryBadgeColor(product.category)}">
                        ${this.formatCategory(product.category)}
                    </span>
                </td>
                <td>$${product.price.toFixed(2)}</td>
                <td>
                    <span class="badge bg-${product.status === 'active' ? 'success' : 'secondary'}">
                        ${product.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="productManager.editProduct('${product.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="productManager.deleteProduct('${product.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Dashboard methods
    getDashboardStats() {
        const totalProducts = this.products.length;
        const activeProducts = this.products.filter(product => product.status === 'active').length;
        const pendingCount = this.getPendingProductsCount();
        const farmProducts = this.products.filter(product => product.farmId).length;
        
        return {
            totalProducts,
            activeProducts,
            pendingCount,
            farmProducts
        };
    }

    updateDashboardStats() {
        const stats = this.getDashboardStats();
        
        this.updateElement('total-products', stats.totalProducts);
        this.updateElement('active-products', stats.activeProducts);
        this.updateElement('pending-products', stats.pendingCount);
        this.updateElement('farm-products', stats.farmProducts);
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // GET PENDING PRODUCTS COUNT
    getPendingProductsCount() {
        return this.getPendingProducts().length;
    }

    // EMPTY PRODUCTS HTML
    getEmptyProductsHTML() {
        return `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="bi bi-inbox display-4 d-block text-muted mb-2"></i>
                    <p class="text-muted">No products found.</p>
                    <small class="text-muted d-block">Products from owners will appear here for approval.</small>
                </td>
            </tr>
        `;
    }

    getCategoryBadgeColor(category) {
        const colors = {
            fruit: 'success',
            vegetable: 'info',
            seed: 'primary',
            meat: 'danger',
            equipment: 'warning'
        };
        return colors[category] || 'secondary';
    }

    formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    // Public methods for other parts of the application
    getAllProducts() {
        return this.products;
    }

    getActiveProducts() {
        return this.products.filter(product => product.status === 'active');
    }
}

// Initialize product manager
const productManager = new ProductManager();