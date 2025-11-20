// Owner Order Management - Shows only farm's product orders
class OwnerOrderManager {
    constructor() {
        this.currentFarm = null;
        this.farmOrders = [];
        this.adminCommissionRate = 0.15; // 15% admin commission
        this.init();
    }

    init() {
        this.currentFarm = OwnerAuth.getCurrentFarm();
        if (!this.currentFarm) {
            console.error('No farm data found');
            return;
        }

        if (window.location.pathname.includes('/owner/orders.html')) {
            this.loadFarmOrders();
            this.loadRevenueStats();
            this.setupEventListeners();
        }
    }

    // Load orders that contain this farm's products - FIXED VERSION
    async loadFarmOrders() {
        try {
            const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
            const farmProducts = await this.getFarmProducts();
            
            console.log('=== DEBUG ORDER DATA ===');
            console.log('All orders:', allOrders);
            console.log('Farm products:', farmProducts);
            console.log('Current farm ID:', this.currentFarm?.id);
            console.log('Current farm name:', this.currentFarm?.farm?.name);

            // Filter orders that contain this farm's products
            this.farmOrders = allOrders.filter(order => {
                const hasFarmProducts = order.items.some(item => {
                    // Check multiple ways to identify farm products
                    const isFarmProduct = 
                        // Check by product ID match
                        farmProducts.some(product => product.id === item.id) ||
                        // Check by farm ID in item
                        item.farmId === this.currentFarm.id ||
                        // Check by farm name in item
                        item.farmName === this.currentFarm.farm?.name;
                    
                    if (isFarmProduct) {
                        console.log(`✅ Found farm product in order ${order.id}:`, item);
                    }
                    return isFarmProduct;
                });
                
                if (hasFarmProducts) {
                    console.log(`✅ Order ${order.id} contains farm products`);
                }
                return hasFarmProducts;
            });

            console.log('Filtered farm orders:', this.farmOrders);
            this.displayFarmOrders();
            
            // Update stats after loading orders
            this.loadRevenueStats();
        } catch (error) {
            console.error('Error loading farm orders:', error);
        }
    }

    // Get farm's products from all possible sources - FIXED VERSION
    async getFarmProducts() {
        let farmProducts = [];
        
        console.log('=== GETTING FARM PRODUCTS ===');
        
        // Method 1: Get from owner products (pending/approved)
        const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
        const farmOwnerProducts = ownerProducts.filter(product => 
            product.farmId === this.currentFarm.id
        );
        console.log('Owner products for farm:', farmOwnerProducts);
        
        // Method 2: Get from IndexedDB (approved products)
        let dbProducts = [];
        try {
            dbProducts = await this.getProductsFromIndexedDB();
            console.log('DB products for farm:', dbProducts);
        } catch (error) {
            console.error('Error getting products from IndexedDB:', error);
        }
        
        // Method 3: Get from products in localStorage (fallback)
        const allProducts = JSON.parse(localStorage.getItem('products')) || [];
        const localStorageProducts = allProducts.filter(product => 
            product.farmId === this.currentFarm.id
        );
        console.log('LocalStorage products for farm:', localStorageProducts);
        
        // Combine all products and remove duplicates
        const allFarmProducts = [...farmOwnerProducts, ...dbProducts, ...localStorageProducts];
        farmProducts = allFarmProducts.filter((product, index, self) =>
            index === self.findIndex(p => p.id === product.id)
        );
        
        console.log('Final farm products:', farmProducts);
        return farmProducts;
    }

    // Get products from IndexedDB
    async getProductsFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FarmMarketDB', 4);
            
            request.onerror = () => {
                console.error('Error opening IndexedDB:', request.error);
                resolve([]);
            };
            
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('products')) {
                    resolve([]);
                    return;
                }
                
                const transaction = db.transaction(['products'], 'readonly');
                const store = transaction.objectStore('products');
                
                // Try to use farmId index if it exists
                if (store.indexNames.contains('farmId')) {
                    const index = store.index('farmId');
                    const getRequest = index.getAll(this.currentFarm.id);
                    
                    getRequest.onerror = () => {
                        console.error('Error getting products by farmId:', getRequest.error);
                        resolve([]);
                    };
                    
                    getRequest.onsuccess = () => {
                        resolve(getRequest.result || []);
                    };
                } else {
                    // Fallback: get all products and filter
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onerror = () => {
                        console.error('Error getting all products:', getAllRequest.error);
                        resolve([]);
                    };
                    
                    getAllRequest.onsuccess = () => {
                        const products = getAllRequest.result.filter(product => 
                            product.farmId === this.currentFarm.id
                        );
                        resolve(products);
                    };
                }
            };
        });
    }

    // Calculate farm-specific order values - ENHANCED VERSION
    calculateFarmOrderValues(order) {
        const farmProducts = this.getFarmProductsSync();
        let farmSubtotal = 0;
        let farmItems = [];

        console.log('Calculating values for order:', order.id);
        console.log('Farm products available:', farmProducts.length);

        // Calculate totals only for this farm's products
        order.items.forEach(item => {
            const isFarmProduct = 
                farmProducts.some(product => product.id === item.id) ||
                item.farmId === this.currentFarm.id ||
                item.farmName === this.currentFarm.farm?.name;
            
            if (isFarmProduct) {
                const itemTotal = item.price * item.quantity;
                farmSubtotal += itemTotal;
                farmItems.push({
                    ...item,
                    itemTotal: itemTotal,
                    farmName: item.farmName || this.currentFarm.farm?.name
                });
                console.log(`✅ Added farm item: ${item.name} - $${itemTotal}`);
            }
        });

        // Calculate commission and net earnings (15% admin commission)
        const adminCommission = farmSubtotal * this.adminCommissionRate;
        const netEarnings = farmSubtotal - adminCommission;

        console.log(`Order ${order.id} - Farm subtotal: $${farmSubtotal}, Commission: $${adminCommission}, Net: $${netEarnings}`);

        return {
            farmSubtotal,
            adminCommission,
            netEarnings,
            farmItems,
            itemCount: farmItems.length
        };
    }

    // Synchronous version for immediate use
    getFarmProductsSync() {
        try {
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            const allProducts = JSON.parse(localStorage.getItem('products')) || [];
            
            return [
                ...ownerProducts.filter(p => p.farmId === this.currentFarm.id),
                ...allProducts.filter(p => p.farmId === this.currentFarm.id)
            ];
        } catch (error) {
            console.error('Error getting farm products sync:', error);
            return [];
        }
    }

    // Load revenue statistics - FIXED: Now updates properly
    loadRevenueStats() {
        const statsContainer = document.getElementById('farm-revenue-stats');
        if (!statsContainer) return;

        const stats = this.getFarmRevenueStats();

        console.log('=== REVENUE STATS ===', stats);

        statsContainer.innerHTML = `
            <div class="col-xl-3 col-md-6">
                <div class="owner-card stats-card">
                    <i class="bi bi-cart-check display-4 text-primary"></i>
                    <span class="stats-number">${stats.totalOrders}</span>
                    <span class="stats-label">Total Orders</span>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="owner-card stats-card">
                    <i class="bi bi-currency-dollar display-4 text-success"></i>
                    <span class="stats-number">$${stats.totalRevenue.toFixed(2)}</span>
                    <span class="stats-label">Farm Revenue</span>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="owner-card stats-card">
                    <i class="bi bi-building display-4 text-warning"></i>
                    <span class="stats-number">$${stats.totalCommission.toFixed(2)}</span>
                    <span class="stats-label">Admin Commission</span>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="owner-card stats-card">
                    <i class="bi bi-wallet2 display-4 text-info"></i>
                    <span class="stats-number">$${stats.netEarnings.toFixed(2)}</span>
                    <span class="stats-label">Net Earnings</span>
                </div>
            </div>
        `;
    }

    // Get farm revenue statistics - FIXED VERSION: Counts all orders but only delivered for revenue
    getFarmRevenueStats() {
        let totalRevenue = 0;
        let totalCommission = 0;
        let netEarnings = 0;
        
        const totalOrders = this.farmOrders.length;

        // Calculate revenue only from delivered orders
        const deliveredOrders = this.farmOrders.filter(order => order.status === 'delivered');
        
        deliveredOrders.forEach(order => {
            const farmValues = this.calculateFarmOrderValues(order);
            totalRevenue += farmValues.farmSubtotal;
            totalCommission += farmValues.adminCommission;
            netEarnings += farmValues.netEarnings;
        });

        console.log('Revenue Calculation:', {
            totalOrders,
            deliveredOrders: deliveredOrders.length,
            totalRevenue,
            totalCommission,
            netEarnings
        });

        return {
            totalOrders,
            totalRevenue,
            totalCommission,
            netEarnings
        };
    }

    // Refresh stats (call this when orders change)
    refreshStats() {
        this.loadRevenueStats();
    }

    // Display farm orders in table
    displayFarmOrders() {
        const tableBody = document.getElementById('farm-orders-table');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (this.farmOrders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="bi bi-inbox display-4 d-block text-muted mb-2"></i>
                        <p class="text-muted">No orders found for your farm products</p>
                        <div class="mt-3">
                            <button class="btn btn-primary me-2" onclick="ownerOrderManager.debugData()">
                                <i class="bi bi-bug"></i> Debug Data
                            </button>
                            <button class="btn btn-outline-secondary" onclick="location.reload()">
                                <i class="bi bi-arrow-clockwise"></i> Refresh
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort orders by date (newest first)
        const sortedOrders = [...this.farmOrders].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        sortedOrders.forEach(order => {
            const farmValues = this.calculateFarmOrderValues(order);
            const orderDate = new Date(order.date).toLocaleDateString();
            const customerName = order.delivery?.location?.firstName + ' ' + order.delivery?.location?.lastName || 'Unknown Customer';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${order.id}</strong>
                    <small class="d-block text-muted">${farmValues.itemCount} of your items</small>
                </td>
                <td>${orderDate}</td>
                <td>${customerName}</td>
                <td>
                    <small>${farmValues.farmItems.map(item => `${item.name} (${item.quantity})`).join(', ')}</small>
                </td>
                <td>$${farmValues.farmSubtotal.toFixed(2)}</td>
                <td>$${farmValues.adminCommission.toFixed(2)}</td>
                <td>
                    <strong class="text-success">$${farmValues.netEarnings.toFixed(2)}</strong>
                </td>
                <td>
                    <span class="badge bg-${this.getStatusBadgeColor(order.status)}">
                        ${this.formatStatus(order.status)}
                    </span>
                    <small class="d-block text-muted">${this.getStatusDescription(order.status)}</small>
                </td>
                <td>
                    <button class="btn btn-outline-primary btn-sm" 
                            onclick="ownerOrderManager.viewOrderDetails('${order.id}')"
                            data-bs-toggle="tooltip" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Initialize tooltips
        this.initTooltips();
        
        // Refresh stats after displaying orders
        this.loadRevenueStats();
    }

    // View order details
    viewOrderDetails(orderId) {
        const order = this.farmOrders.find(o => o.id === orderId);
        if (!order) {
            alert('Order not found!');
            return;
        }

        const farmValues = this.calculateFarmOrderValues(order);
        this.showOrderModal(order, farmValues);
    }

    // Show order details modal
    showOrderModal(order, farmValues) {
        const orderDate = new Date(order.date).toLocaleString();
        const customer = order.delivery?.location;

        // Create modal HTML
        const modalHTML = `
            <div class="modal fade" id="orderModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Order Details - ${order.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Order Information</h6>
                                    <p><strong>Date:</strong> ${orderDate}</p>
                                    <p><strong>Status:</strong> 
                                        <span class="badge bg-${this.getStatusBadgeColor(order.status)}">
                                            ${this.formatStatus(order.status)}
                                        </span>
                                    </p>
                                    <p><strong>Payment Method:</strong> ${this.formatPaymentMethod(order.paymentMethod)}</p>
                                    <p><strong>Your Items in Order:</strong> ${farmValues.itemCount}</p>
                                    ${order.status !== 'delivered' ? `
                                        <div class="alert alert-warning mt-2">
                                            <small><i class="bi bi-info-circle"></i> Revenue will be counted when order is delivered</small>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="col-md-6">
                                    <h6>Customer Information</h6>
                                    <p><strong>Name:</strong> ${customer?.firstName} ${customer?.lastName}</p>
                                    <p><strong>Email:</strong> ${customer?.email}</p>
                                    <p><strong>Phone:</strong> ${customer?.phone}</p>
                                    <p><strong>Address:</strong> ${customer?.address}, ${customer?.city}, ${customer?.zipCode}, ${customer?.country}</p>
                                    ${customer?.instructions ? `<p><strong>Delivery Instructions:</strong> ${customer.instructions}</p>` : ''}
                                </div>
                            </div>
                            
                            <hr>
                            
                            <h6>Your Products in This Order</h6>
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i> 
                                This order contains products from multiple farms. You are only seeing your products.
                                Only admin can update order status.
                            </div>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Quantity</th>
                                            <th>Price</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${farmValues.farmItems.map(item => `
                                            <tr>
                                                <td>
                                                    <strong>${item.name}</strong>
                                                    ${item.farmName ? `<br><small class="text-muted">From: ${item.farmName}</small>` : ''}
                                                </td>
                                                <td>${item.quantity}</td>
                                                <td>$${item.price.toFixed(2)}</td>
                                                <td>$${item.itemTotal.toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="row mt-3">
                                <div class="col-md-6">
                                    <div class="alert alert-warning">
                                        <h6><i class="bi bi-shield-exclamation"></i> Order Status Note</h6>
                                        <p class="mb-0">Order status is managed by admin since this order contains products from multiple farms.</p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="border rounded p-3 bg-light">
                                        <h6>Your Earnings Summary</h6>
                                        <div class="d-flex justify-content-between">
                                            <span>Your Products Subtotal:</span>
                                            <span>$${farmValues.farmSubtotal.toFixed(2)}</span>
                                        </div>
                                        <div class="d-flex justify-content-between text-warning">
                                            <span>Admin Commission (15%):</span>
                                            <span>-$${farmValues.adminCommission.toFixed(2)}</span>
                                        </div>
                                        <hr>
                                        <div class="d-flex justify-content-between fw-bold text-success">
                                            <span>Your Net Earnings:</span>
                                            <span>$${farmValues.netEarnings.toFixed(2)}</span>
                                        </div>
                                        ${order.status !== 'delivered' ? `
                                            <div class="alert alert-info mt-2">
                                                <small><i class="bi bi-clock"></i> Earnings will be available after delivery</small>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('orderModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const orderModal = new bootstrap.Modal(document.getElementById('orderModal'));
        orderModal.show();
    }

    // Setup event listeners for search and filter
    setupEventListeners() {
        const searchInput = document.getElementById('order-search');
        const statusFilter = document.getElementById('order-status-filter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterOrders(e.target.value, statusFilter?.value);
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterOrders(searchInput?.value, e.target.value);
            });
        }

        // Auto-refresh stats when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshStats();
            }
        });
    }

    // Filter orders based on search term and status
    filterOrders(searchTerm, statusFilter) {
        let filteredOrders = this.farmOrders;

        // Filter by status
        if (statusFilter && statusFilter !== 'all') {
            filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredOrders = filteredOrders.filter(order => 
                order.id.toLowerCase().includes(term) ||
                (order.delivery?.location?.firstName + ' ' + order.delivery?.location?.lastName).toLowerCase().includes(term) ||
                order.items.some(item => 
                    this.getFarmProductsSync().some(p => p.id === item.id) && 
                    item.name.toLowerCase().includes(term)
                )
            );
        }

        this.updateOrdersTable(filteredOrders);
    }

    // Update orders table with filtered results
    updateOrdersTable(orders) {
        const tableBody = document.getElementById('farm-orders-table');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (orders.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="bi bi-search display-4 d-block text-muted mb-2"></i>
                        <p class="text-muted">No orders match your search</p>
                    </td>
                </tr>
            `;
            return;
        }

        orders.forEach(order => {
            const farmValues = this.calculateFarmOrderValues(order);
            const orderDate = new Date(order.date).toLocaleDateString();
            const customerName = order.delivery?.location?.firstName + ' ' + order.delivery?.location?.lastName || 'Unknown Customer';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${order.id}</strong>
                    <small class="d-block text-muted">${farmValues.itemCount} of your items</small>
                </td>
                <td>${orderDate}</td>
                <td>${customerName}</td>
                <td>
                    <small>${farmValues.farmItems.map(item => `${item.name} (${item.quantity})`).join(', ')}</small>
                </td>
                <td>$${farmValues.farmSubtotal.toFixed(2)}</td>
                <td>$${farmValues.adminCommission.toFixed(2)}</td>
                <td>
                    <strong class="text-success">$${farmValues.netEarnings.toFixed(2)}</strong>
                </td>
                <td>
                    <span class="badge bg-${this.getStatusBadgeColor(order.status)}">
                        ${this.formatStatus(order.status)}
                    </span>
                    <small class="d-block text-muted">${this.getStatusDescription(order.status)}</small>
                </td>
                <td>
                    <button class="btn btn-outline-primary btn-sm" 
                            onclick="ownerOrderManager.viewOrderDetails('${order.id}')"
                            data-bs-toggle="tooltip" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        this.initTooltips();
    }

    // Initialize tooltips
    initTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Debug method to check data
    debugData() {
        console.log('=== OWNER ORDER MANAGER DEBUG ===');
        console.log('Current Farm:', this.currentFarm);
        console.log('Farm ID:', this.currentFarm?.id);
        console.log('Farm Name:', this.currentFarm?.farm?.name);
        
        const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
        console.log('All orders:', allOrders);
        
        const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
        console.log('Owner products:', ownerProducts);
        
        const farmOwnerProducts = ownerProducts.filter(p => p.farmId === this.currentFarm?.id);
        console.log('Farm owner products:', farmOwnerProducts);
        
        console.log('Farm orders found:', this.farmOrders);
        
        // Calculate and show revenue stats
        const stats = this.getFarmRevenueStats();
        console.log('Revenue Stats:', stats);
        
        console.log('==============================');
        
        alert(`Check browser console for debug information\n\nStats:\n- Total Orders: ${stats.totalOrders}\n- Farm Revenue: $${stats.totalRevenue.toFixed(2)}\n- Admin Commission: $${stats.totalCommission.toFixed(2)}\n- Net Earnings: $${stats.netEarnings.toFixed(2)}`);
    }

    // Helper methods
    getStatusBadgeColor(status) {
        const colors = {
            pending: 'warning',
            confirmed: 'info',
            shipped: 'primary',
            delivered: 'success',
            cancelled: 'danger'
        };
        return colors[status] || 'secondary';
    }

    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    getStatusDescription(status) {
        const descriptions = {
            pending: 'Waiting for confirmation',
            confirmed: 'Order confirmed',
            shipped: 'On the way to customer',
            delivered: 'Successfully delivered',
            cancelled: 'Order cancelled'
        };
        return descriptions[status] || 'Unknown status';
    }

    formatPaymentMethod(method) {
        const methods = {
            cash: 'Cash on Delivery',
            digital: 'Digital Wallet',
            card: 'Credit/Debit Card'
        };
        return methods[method] || method;
    }
}

// Initialize owner order manager
const ownerOrderManager = new OwnerOrderManager();

// Add debug function to window for testing
window.debugOwnerOrders = () => {
    ownerOrderManager.debugData();
};

// Auto-refresh when coming back to the page
document.addEventListener('DOMContentLoaded', function() {
    // Refresh stats after a short delay to ensure everything is loaded
    setTimeout(() => {
        if (window.ownerOrderManager) {
            window.ownerOrderManager.refreshStats();
        }
    }, 1000);
});