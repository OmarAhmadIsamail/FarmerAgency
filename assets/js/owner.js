// Owner Dashboard JavaScript
class OwnerDashboard {
    constructor() {
        this.ownerData = null;
        this.farmData = null;
        this.ownerProducts = [];
        this.adminProducts = [];
        this.farmOrders = [];
        this.isLoading = false;
        this.autoRefreshInterval = null;
        this.init();
    }

    async init() {
        await this.checkAuthentication();
        await this.loadOwnerData();
        this.setupLogout();
        await this.loadAllProducts(); // Wait for products to load first
        await this.loadFarmOrders(); // Load orders data
        this.initializeDashboard();
        
        // Set up periodic refresh to catch admin approvals and order updates
        this.setupAutoRefresh();
    }

    setupAutoRefresh() {
        // Clear any existing interval first
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        // Refresh data every 10 seconds without page reload
        this.autoRefreshInterval = setInterval(async () => {
            if (!this.isLoading) {
                console.log('Auto-refreshing dashboard data...');
                await this.silentRefresh();
            }
        }, 10000); // 10 seconds instead of 5 to reduce load
        
        // NEW: Listen for storage events (from orders page)
        window.addEventListener('storage', async (e) => {
            if (e.key === 'dashboardUpdate' || e.key === 'orders') {
                console.log('Storage event detected, refreshing dashboard...');
                await this.silentRefresh();
            }
        });
        
        // NEW: Listen for custom events
        window.addEventListener('ordersUpdated', async () => {
            console.log('Custom orders event detected, refreshing dashboard...');
            await this.silentRefresh();
        });
        
        // NEW: Poll for localStorage changes as fallback
        this.setupLocalStoragePolling();
    }

    // NEW METHOD: Setup localStorage polling as fallback
    setupLocalStoragePolling() {
        let lastUpdate = localStorage.getItem('dashboardLastUpdate');
        
        setInterval(() => {
            const currentUpdate = localStorage.getItem('dashboardLastUpdate');
            if (currentUpdate !== lastUpdate) {
                lastUpdate = currentUpdate;
                this.silentRefresh();
            }
        }, 2000); // Check every 2 seconds
    }

    // Silent refresh without loading indicators
    async silentRefresh() {
        try {
            this.isLoading = true;
            
            // Store current counts to check if anything changed
            const previousOwnerCount = this.ownerProducts.length;
            const previousAdminCount = this.adminProducts.length;
            const previousOrderCount = this.farmOrders ? this.farmOrders.length : 0;
            
            // Load from owner products (pending, rejected)
            const newOwnerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            this.ownerProducts = newOwnerProducts.filter(product => 
                product.farmId === this.ownerData.id
            );
            
            // Load from admin products (approved/active) - using IndexedDB
            const newAdminProducts = await this.getApprovedProductsFromDB();
            this.adminProducts = newAdminProducts.filter(product => 
                product.farmId === this.ownerData.id
            );
            
            // Refresh orders data
            await this.loadFarmOrders();
            
            // Only update UI if data actually changed
            const ownerChanged = previousOwnerCount !== this.ownerProducts.length;
            const adminChanged = previousAdminCount !== this.adminProducts.length;
            const ordersChanged = previousOrderCount !== (this.farmOrders ? this.farmOrders.length : 0);
            
            if (ownerChanged || adminChanged || ordersChanged) {
                console.log('Data changed, updating dashboard...');
                this.updateDashboard();
            }
            
        } catch (error) {
            console.error('Error in silent refresh:', error);
        } finally {
            this.isLoading = false;
        }
    }

    // NEW METHOD: Load farm orders data
    async loadFarmOrders() {
        try {
            const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
            const farmProducts = this.getAllFarmProducts();
            
            // Filter orders that contain this farm's products
            this.farmOrders = allOrders.filter(order => {
                return order.items.some(item => {
                    return farmProducts.some(product => 
                        product.id === item.id || 
                        item.farmId === this.ownerData.id ||
                        item.farmName === this.ownerData.farm?.name
                    );
                });
            });

            console.log('Dashboard - Farm orders loaded:', this.farmOrders.length);
            return this.farmOrders;
        } catch (error) {
            console.error('Error loading farm orders in dashboard:', error);
            return [];
        }
    }

    // NEW METHOD: Calculate farm revenue stats (same as orders page)
    getFarmRevenueStats() {
        if (!this.farmOrders || this.farmOrders.length === 0) {
            return {
                totalOrders: 0,
                totalRevenue: 0,
                totalCommission: 0,
                netEarnings: 0
            };
        }

        let totalRevenue = 0;
        let totalCommission = 0;
        let netEarnings = 0;
        const adminCommissionRate = 0.15; // 15%

        // Calculate revenue only from delivered orders
        const deliveredOrders = this.farmOrders.filter(order => order.status === 'delivered');
        
        deliveredOrders.forEach(order => {
            const farmValues = this.calculateFarmOrderValues(order);
            totalRevenue += farmValues.farmSubtotal;
            totalCommission += farmValues.adminCommission;
            netEarnings += farmValues.netEarnings;
        });

        return {
            totalOrders: this.farmOrders.length,
            totalRevenue,
            totalCommission,
            netEarnings
        };
    }

    // NEW METHOD: Calculate farm-specific order values
    calculateFarmOrderValues(order) {
        const farmProducts = this.getAllFarmProducts();
        let farmSubtotal = 0;
        let farmItems = [];
        const adminCommissionRate = 0.15;

        // Calculate totals only for this farm's products
        order.items.forEach(item => {
            const isFarmProduct = farmProducts.some(product => 
                product.id === item.id || 
                item.farmId === this.ownerData.id ||
                item.farmName === this.ownerData.farm?.name
            );
            
            if (isFarmProduct) {
                const itemTotal = item.price * item.quantity;
                farmSubtotal += itemTotal;
                farmItems.push({
                    ...item,
                    itemTotal: itemTotal
                });
            }
        });

        // Calculate commission and net earnings
        const adminCommission = farmSubtotal * adminCommissionRate;
        const netEarnings = farmSubtotal - adminCommission;

        return {
            farmSubtotal,
            adminCommission,
            netEarnings,
            farmItems,
            itemCount: farmItems.length
        };
    }

    async checkAuthentication() {
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
    }

    async loadOwnerData() {
        if (this.ownerData) {
            // Update owner name
            const ownerName = `${this.ownerData.owner.firstName} ${this.ownerData.owner.lastName}`;
            document.getElementById('owner-name').textContent = ownerName;
            
            // Update farm name
            const farmName = this.ownerData.farm.name;
            document.getElementById('farm-name').textContent = farmName;
            document.getElementById('display-farm-name').textContent = farmName;
            
            // Update page title
            document.title = `${farmName} - Owner Dashboard`;
            
            // Load farm data
            await this.loadFarmData();
        }
    }

    async loadFarmData() {
        const farmStorageKey = `farmData_${this.ownerData.id}`;
        const farmData = localStorage.getItem(farmStorageKey);
        
        if (farmData) {
            this.farmData = JSON.parse(farmData);
        } else {
            this.initializeNewFarmData(farmStorageKey);
        }
    }

    initializeNewFarmData(storageKey) {
        this.farmData = {
            products: [],
            orders: [],
            totalRevenue: 0,
            adminCommission: 0,
            netEarnings: 0,
            customerCount: 0,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(this.farmData));
    }

    // LOAD ALL PRODUCTS FROM BOTH SOURCES - IMPROVED WITH BETTER ASYNC HANDLING
    async loadAllProducts() {
        this.isLoading = true;
        
        try {
            // Show loading state
            this.showLoadingState();
            
            // Load from owner products (pending, rejected) - synchronous
            this.ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            
            // Load from admin products (approved/active) - using IndexedDB
            this.adminProducts = await this.getApprovedProductsFromDB();
            
            // Filter products for current farm
            this.ownerProducts = this.ownerProducts.filter(product => 
                product.farmId === this.ownerData.id
            );
            
            this.adminProducts = this.adminProducts.filter(product => 
                product.farmId === this.ownerData.id
            );

            console.log('Owner Products:', this.ownerProducts);
            console.log('Admin Products:', this.adminProducts);
            
            // Hide loading state
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.ownerProducts = [];
            this.adminProducts = [];
            this.hideLoadingState();
        } finally {
            this.isLoading = false;
        }
    }

    showLoadingState() {
        // Add loading indicators to product sections
        const productSections = ['recent-farm-products', 'recent-farm-orders'];
        
        productSections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element && element.children.length === 0) {
                element.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-3">
                            <div class="spinner-border spinner-border-sm" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <span class="ms-2">Loading...</span>
                        </td>
                    </tr>
                `;
            }
        });
    }

    hideLoadingState() {
        // Loading state is automatically removed when we render the actual content
    }

    // Get approved products from IndexedDB - IMPROVED WITH TIMEOUT
    async getApprovedProductsFromDB() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.warn('IndexedDB request timed out, using fallback');
                resolve([]);
            }, 3000); // 3 second timeout

            const request = indexedDB.open('FarmMarketDB', 4);
            
            request.onerror = () => {
                clearTimeout(timeout);
                console.error('Error opening database');
                resolve([]);
            };
            
            request.onsuccess = (event) => {
                clearTimeout(timeout);
                const db = event.target.result;
                
                try {
                    const transaction = db.transaction(['products'], 'readonly');
                    const store = transaction.objectStore('products');
                    
                    let products = [];
                    
                    // Try to use farmId index if it exists
                    if (store.indexNames.contains('farmId')) {
                        const index = store.index('farmId');
                        const getAllRequest = index.getAll(this.ownerData.id);
                        
                        getAllRequest.onsuccess = () => {
                            products = getAllRequest.result.filter(product => 
                                product.status === 'approved' || product.status === 'active'
                            );
                            resolve(products);
                        };
                        
                        getAllRequest.onerror = () => {
                            console.error('Error getting products by farmId');
                            resolve([]);
                        };
                    } else {
                        // Fallback: get all products and filter
                        const getAllRequest = store.getAll();
                        
                        getAllRequest.onsuccess = () => {
                            products = getAllRequest.result.filter(product => 
                                product.farmId === this.ownerData.id && 
                                (product.status === 'approved' || product.status === 'active')
                            );
                            resolve(products);
                        };
                        
                        getAllRequest.onerror = () => {
                            console.error('Error getting all products');
                            resolve([]);
                        };
                    }
                } catch (error) {
                    console.error('Error in transaction:', error);
                    resolve([]);
                }
            };
            
            request.onupgradeneeded = (event) => {
                // Handle database upgrade if needed
                const db = event.target.result;
                if (!db.objectStoreNames.contains('products')) {
                    const store = db.createObjectStore('products', { keyPath: 'id' });
                    store.createIndex('farmId', 'farmId', { unique: false });
                }
            };
        });
    }

    // GET ALL PRODUCTS FOR CURRENT FARM - INCLUDES BOTH PENDING AND APPROVED
    getAllFarmProducts() {
        const allProducts = [];
        
        // Add approved products from admin (IndexedDB)
        allProducts.push(...this.adminProducts);
        
        // Add pending products from owner (localStorage)
        const pendingProducts = this.ownerProducts.filter(product => 
            product.status === 'pending'
        );
        allProducts.push(...pendingProducts);
        
        // Add rejected products from owner (localStorage)
        const rejectedProducts = this.ownerProducts.filter(product => 
            product.status === 'rejected'
        );
        allProducts.push(...rejectedProducts);
        
        console.log('All Farm Products:', allProducts);
        return allProducts;
    }

    // GET ACTIVE PRODUCTS ONLY (for stats)
    getActiveProducts() {
        return this.adminProducts.filter(product => 
            product.status === 'active' || product.status === 'approved'
        );
    }

    // UPDATE: Enhanced updateDashboard method with orders data
    async updateDashboard() {
        if (this.ownerData) {
            // Ensure we have latest orders data
            await this.loadFarmOrders();
            
            const allProducts = this.getAllFarmProducts();
            const activeProducts = this.getActiveProducts();
            const revenueStats = this.getFarmRevenueStats();
            
            // Update stats with real data
            document.getElementById('farm-products').textContent = allProducts.length;
            document.getElementById('farm-orders').textContent = revenueStats.totalOrders;
            document.getElementById('farm-revenue').textContent = `$${revenueStats.totalRevenue.toFixed(2)}`;
            document.getElementById('admin-commission').textContent = `$${revenueStats.totalCommission.toFixed(2)}`;
            
            // Display real products and orders
            this.renderFarmProducts();
            this.renderFarmOrders();
            
            console.log('Dashboard updated with orders data:', revenueStats);
        }
    }

    updateCommissionDisplay() {
        let commissionElement = document.getElementById('admin-commission');
        if (commissionElement) {
            const revenueStats = this.getFarmRevenueStats();
            commissionElement.textContent = `$${revenueStats.totalCommission.toFixed(2)}`;
        }
    }

    renderFarmProducts() {
        const tbody = document.getElementById('recent-farm-products');
        if (!tbody) return;
        
        // Get ALL products (including pending and approved) for dashboard display
        const allProducts = this.getAllFarmProducts();
        
        if (allProducts.length === 0) {
            this.renderEmptyProducts();
            return;
        }
        
        // Sort by date and get recent 3
        const recentProducts = allProducts
            .sort((a, b) => new Date(b.submittedDate || b.createdAt || b.dateAdded) - new Date(a.submittedDate || a.createdAt || a.dateAdded))
            .slice(0, 3); // Show only last 3 products
        
        console.log('Recent Products for Dashboard:', recentProducts);
        
        tbody.innerHTML = recentProducts.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>$${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.stock || product.quantity || 0}</td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(product.status)}">
                        ${this.formatStatus(product.status)}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // UPDATE: Enhanced renderFarmOrders method for dashboard with real order data - SHOW ONLY LAST 3 (NO EXTRA MESSAGE)
    renderFarmOrders() {
        const tbody = document.getElementById('recent-farm-orders');
        if (!tbody) return;
        
        if (!this.farmOrders || this.farmOrders.length === 0) {
            this.renderEmptyOrders();
            return;
        }
        
        // Get recent 3 orders sorted by date (newest first)
        const recentOrders = [...this.farmOrders]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3); // Show only last 3 orders
        
        console.log('Displaying last 3 orders:', recentOrders.length);
        
        tbody.innerHTML = recentOrders.map(order => {
            const farmValues = this.calculateFarmOrderValues(order);
            const customerName = order.delivery?.location?.firstName + ' ' + order.delivery?.location?.lastName || 'Customer';
            const orderDate = new Date(order.date).toLocaleDateString();
            
            return `
                <tr>
                    <td>
                        <strong>${order.id}</strong>
                        <small class="d-block text-muted">${orderDate}</small>
                    </td>
                    <td>${customerName}</td>
                    <td>$${farmValues.farmSubtotal.toFixed(2)}</td>
                    <td>
                        <span class="badge ${this.getOrderStatusBadgeClass(order.status)}">
                            ${this.formatOrderStatus(order.status)}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
        // REMOVED: The "And X more orders" message
    }

    getStatusBadgeClass(status) {
        const statusMap = {
            'active': 'badge-success',
            'approved': 'badge-success',
            'pending': 'badge-warning',
            'rejected': 'badge-danger',
            'inactive': 'badge-secondary'
        };
        return statusMap[status.toLowerCase()] || 'badge-secondary';
    }

    getOrderStatusBadgeClass(status) {
        const statusMap = {
            'delivered': 'badge-success',
            'shipped': 'badge-info',
            'processing': 'badge-warning',
            'pending': 'badge-warning',
            'cancelled': 'badge-danger'
        };
        return statusMap[status.toLowerCase()] || 'badge-secondary';
    }

    formatStatus(status) {
        const statusMap = {
            'active': 'Active',
            'approved': 'Active',
            'pending': 'Pending',
            'rejected': 'Rejected',
            'inactive': 'Inactive'
        };
        return statusMap[status.toLowerCase()] || status;
    }

    formatOrderStatus(status) {
        const statusMap = {
            'delivered': 'Delivered',
            'shipped': 'Shipped',
            'processing': 'Processing',
            'pending': 'Pending',
            'cancelled': 'Cancelled'
        };
        return statusMap[status.toLowerCase()] || status;
    }

    renderEmptyProducts() {
        const tbody = document.getElementById('recent-farm-products');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4">
                    <div class="text-muted">
                        <i class="bi bi-inbox display-4 d-block mb-2"></i>
                        <p class="mb-1">No products yet</p>
                        <small>Start by adding your first product</small>
                        <div class="mt-3">
                            <a href="products.html" class="btn btn-sm btn-primary">
                                <i class="bi bi-plus-circle"></i> Add First Product
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    renderEmptyOrders() {
        const tbody = document.getElementById('recent-farm-orders');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4">
                    <div class="text-muted">
                        <i class="bi bi-cart-x display-4 d-block mb-2"></i>
                        <p class="mb-1">No orders yet</p>
                        <small>Orders will appear here when customers purchase your products</small>
                        <div class="mt-3">
                            <a href="products.html" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-box-seam"></i> Manage Products
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    setupLogout() {
        // Add logout functionality if not exists
        const existingLogout = document.getElementById('logout-link');
        if (!existingLogout) {
            const logoutItem = document.createElement('li');
            logoutItem.className = 'nav-item';
            logoutItem.innerHTML = `
                <a class="nav-link text-danger" href="#" id="logout-link">
                    <i class="bi bi-box-arrow-right"></i> Logout
                </a>
            `;
            document.querySelector('.sidebar-nav').appendChild(logoutItem);

            document.getElementById('logout-link').addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear the auto-refresh interval
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
            }
            
            if (this.ownerData) {
                this.ownerData.isLoggedIn = false;
                localStorage.setItem('farmOwnerData', JSON.stringify(this.ownerData));
            }
            window.location.href = '../auth/owner-login.html';
        }
    }

    initializeDashboard() {
        this.updateDashboard();
    }

    // Refresh dashboard data (call this when products change)
    async refreshDashboard() {
        await this.loadAllProducts();
        await this.loadFarmOrders();
        this.updateDashboard();
    }

    // NEW METHOD: Force immediate refresh from external sources
    async forceRefresh() {
        console.log('Force refreshing dashboard...');
        await this.loadAllProducts();
        await this.loadFarmOrders();
        this.updateDashboard();
    }

    // Clean up method to stop auto-refresh
    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
}

// Product Management Class (Unified for both dashboard and products page)
class ProductManager {
    static getCurrentFarm() {
        const ownerData = localStorage.getItem('farmOwnerData');
        if (!ownerData) return null;
        
        const parsedData = JSON.parse(ownerData);
        if (!parsedData.isLoggedIn) return null;
        
        return parsedData;
    }

    static async getAllProducts() {
        const currentFarm = this.getCurrentFarm();
        if (!currentFarm) return [];

        try {
            // Load from both sources
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            const adminProducts = await this.getApprovedProductsFromDB();
            
            // Filter for current farm
            const farmOwnerProducts = ownerProducts.filter(product => 
                product.farmId === currentFarm.id
            );
            const farmAdminProducts = adminProducts.filter(product => 
                product.farmId === currentFarm.id
            );

            return [...farmOwnerProducts, ...farmAdminProducts];
        } catch (error) {
            console.error('Error getting all products:', error);
            return [];
        }
    }

    static async getApprovedProductsFromDB() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('ProductManager: IndexedDB timeout');
                resolve([]);
            }, 2000);

            const request = indexedDB.open('FarmMarketDB', 4);
            
            request.onerror = () => {
                clearTimeout(timeout);
                resolve([]);
            };
            
            request.onsuccess = (event) => {
                clearTimeout(timeout);
                const db = event.target.result;
                try {
                    const transaction = db.transaction(['products'], 'readonly');
                    const store = transaction.objectStore('products');
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onsuccess = () => {
                        const products = getAllRequest.result.filter(product => 
                            product.status === 'approved' || product.status === 'active'
                        );
                        resolve(products);
                    };
                    
                    getAllRequest.onerror = () => resolve([]);
                } catch (error) {
                    resolve([]);
                }
            };
            
            request.onupgradeneeded = () => {
                // Handle upgrade if needed
            };
        });
    }

    static getProductsByStatus(status) {
        const products = this.getAllProducts();
        return products.filter(product => 
            product.status.toLowerCase() === status.toLowerCase()
        );
    }

    static async getActiveProducts() {
        const adminProducts = await this.getApprovedProductsFromDB();
        const currentFarm = this.getCurrentFarm();
        
        if (!currentFarm) return [];
        
        return adminProducts.filter(product => 
            product.farmId === currentFarm.id && 
            (product.status === 'active' || product.status === 'approved')
        );
    }

    static getPendingProducts() {
        const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
        const currentFarm = this.getCurrentFarm();
        
        if (!currentFarm) return [];
        
        return ownerProducts.filter(product => 
            product.farmId === currentFarm.id && product.status === 'pending'
        );
    }

    static getRejectedProducts() {
        const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
        const currentFarm = this.getCurrentFarm();
        
        if (!currentFarm) return [];
        
        return ownerProducts.filter(product => 
            product.farmId === currentFarm.id && product.status === 'rejected'
        );
    }

    static async getProductCount() {
        const products = await this.getAllProducts();
        return products.length;
    }

    static async getActiveProductCount() {
        const products = await this.getActiveProducts();
        return products.length;
    }

    static async getRecentProducts(count = 3) {
        const products = await this.getAllProducts();
        return products
            .sort((a, b) => new Date(b.submittedDate || b.createdAt) - new Date(a.submittedDate || a.createdAt))
            .slice(0, count);
    }

    static refreshDashboard() {
        if (window.ownerDashboard && window.ownerDashboard.forceRefresh) {
            window.ownerDashboard.forceRefresh();
        }
    }

    // NEW METHOD: Quick refresh for immediate updates
    static quickRefresh() {
        if (window.ownerDashboard) {
            // Update owner products immediately from localStorage
            const currentFarm = this.getCurrentFarm();
            if (currentFarm) {
                const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
                window.ownerDashboard.ownerProducts = ownerProducts.filter(product => 
                    product.farmId === currentFarm.id
                );
                window.ownerDashboard.updateDashboard();
            }
        }
    }
}

// Revenue management functions
class RevenueManager {
    static calculateCommission(totalAmount) {
        const commissionRate = 0.15; // 15%
        return totalAmount * commissionRate;
    }

    static updateFarmRevenue(farmId, orderAmount) {
        const farmStorageKey = `farmData_${farmId}`;
        const farmData = JSON.parse(localStorage.getItem(farmStorageKey));
        
        if (farmData) {
            const commission = this.calculateCommission(orderAmount);
            
            farmData.totalRevenue += orderAmount;
            farmData.adminCommission += commission;
            farmData.netEarnings = farmData.totalRevenue - farmData.adminCommission;
            farmData.lastUpdated = new Date().toISOString();
            
            localStorage.setItem(farmStorageKey, JSON.stringify(farmData));
            
            // Also update in admin system
            this.updateAdminSystem(farmId, orderAmount, commission);
            
            return commission;
        }
        
        return 0;
    }

    static updateAdminSystem(farmId, orderAmount, commission) {
        const allFarms = JSON.parse(localStorage.getItem('allFarmOwners') || '[]');
        const farmIndex = allFarms.findIndex(farm => farm.id === farmId);
        
        if (farmIndex !== -1) {
            allFarms[farmIndex].totalRevenue += orderAmount;
            allFarms[farmIndex].adminCommission += commission;
            allFarms[farmIndex].netEarnings = allFarms[farmIndex].totalRevenue - allFarms[farmIndex].adminCommission;
            allFarms[farmIndex].lastUpdated = new Date().toISOString();
            
            localStorage.setItem('allFarmOwners', JSON.stringify(allFarms));
        }
    }
}

// Global function to refresh dashboard from other pages
window.refreshOwnerDashboard = function() {
    if (window.ownerDashboard && window.ownerDashboard.forceRefresh) {
        window.ownerDashboard.forceRefresh();
    }
};

// Initialize dashboard when page loads and make it globally available
document.addEventListener('DOMContentLoaded', async () => {
    window.ownerDashboard = new OwnerDashboard();
    
    // Also set up a global event listener for storage changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'ownerProducts' && window.ownerDashboard) {
            console.log('Owner products changed, refreshing dashboard...');
            ProductManager.quickRefresh();
        }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (window.ownerDashboard && window.ownerDashboard.destroy) {
            window.ownerDashboard.destroy();
        }
    });
});