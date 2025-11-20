// Admin Farms Management JavaScript
class AdminFarmsManager {
    constructor() {
        this.farms = [];
        this.filteredFarms = [];
        this.currentSort = { field: 'name', direction: 'asc' };
        this.searchTerm = '';
        this.init();
    }

    async init() {
        await this.loadFarms();
        this.setupEventListeners();
        this.renderFarmsTable();
        this.updateStats();
    }

    async loadFarms() {
        try {
            // Load from localStorage (registered farms)
            const storedFarms = localStorage.getItem('allFarmOwners');
            this.farms = storedFarms ? JSON.parse(storedFarms) : [];
            
            // Enhance farms with real-time data
            await this.enhanceFarmsData();
            
            this.filteredFarms = [...this.farms];
            console.log('Loaded farms:', this.farms);
        } catch (error) {
            console.error('Error loading farms:', error);
            this.farms = [];
            this.filteredFarms = [];
        }
    }

    async enhanceFarmsData() {
        // Enhance each farm with real products, orders, and revenue data
        for (let farm of this.farms) {
            await this.enhanceFarmData(farm);
        }
    }

    async enhanceFarmData(farm) {
        try {
            // Get farm's products
            const farmProducts = await this.getFarmProducts(farm.id);
            
            // Get farm's orders
            const farmOrders = await this.getFarmOrders(farm.id);
            
            // Calculate real revenue and commission
            const revenueStats = this.calculateFarmRevenue(farmOrders);
            
            // Update farm data with real statistics
            farm.activeProducts = farmProducts.filter(p => 
                p.status === 'active' || p.status === 'approved'
            ).length;
            
            farm.totalProducts = farmProducts.length;
            farm.totalOrders = farmOrders.length;
            farm.totalRevenue = revenueStats.totalRevenue;
            farm.adminCommission = revenueStats.totalCommission;
            farm.netEarnings = revenueStats.netEarnings;
            farm.lastActivity = this.getLastActivity(farmProducts, farmOrders);
            farm.recentProducts = this.getRecentProducts(farmProducts, 3);
            farm.recentOrders = this.getRecentOrders(farmOrders, 3);
            
        } catch (error) {
            console.error(`Error enhancing data for farm ${farm.id}:`, error);
        }
    }

    async getFarmProducts(farmId) {
        try {
            const products = [];
            
            // Get products from owner's localStorage
            const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
            const farmOwnerProducts = ownerProducts.filter(p => p.farmId === farmId);
            products.push(...farmOwnerProducts);
            
            // Get approved products from IndexedDB
            const approvedProducts = await this.getApprovedProductsFromDB();
            const farmApprovedProducts = approvedProducts.filter(p => p.farmId === farmId);
            products.push(...farmApprovedProducts);
            
            return products;
        } catch (error) {
            console.error('Error getting farm products:', error);
            return [];
        }
    }

    async getApprovedProductsFromDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open('FarmMarketDB', 4);
            
            request.onsuccess = (event) => {
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
            
            request.onerror = () => resolve([]);
        });
    }

    async getFarmOrders(farmId) {
        try {
            const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
            const farmProducts = await this.getFarmProducts(farmId);
            
            // Filter orders that contain this farm's products
            return allOrders.filter(order => {
                return order.items.some(item => {
                    return farmProducts.some(product => 
                        product.id === item.id || 
                        item.farmId === farmId ||
                        item.farmName === this.getFarmName(farmId)
                    );
                });
            });
        } catch (error) {
            console.error('Error getting farm orders:', error);
            return [];
        }
    }

    getRecentProducts(products, count = 3) {
        return products
            .sort((a, b) => new Date(b.submittedDate || b.createdAt || b.dateAdded) - new Date(a.submittedDate || a.createdAt || a.dateAdded))
            .slice(0, count);
    }

    getRecentOrders(orders, count = 3) {
        return orders
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, count);
    }

    getFarmName(farmId) {
        const farm = this.farms.find(f => f.id === farmId);
        return farm ? farm.farm.name : 'Unknown Farm';
    }

    calculateFarmRevenue(orders) {
        if (!orders || orders.length === 0) {
            return {
                totalRevenue: 0,
                totalCommission: 0,
                netEarnings: 0
            };
        }

        let totalRevenue = 0;
        let totalCommission = 0;
        const adminCommissionRate = 0.15; // 15%

        // Calculate revenue only from delivered orders
        const deliveredOrders = orders.filter(order => order.status === 'delivered');
        
        deliveredOrders.forEach(order => {
            const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            totalRevenue += orderTotal;
            totalCommission += orderTotal * adminCommissionRate;
        });

        return {
            totalRevenue,
            totalCommission,
            netEarnings: totalRevenue - totalCommission
        };
    }

    getLastActivity(products, orders) {
        let lastActivity = null;
        
        // Check latest product
        if (products.length > 0) {
            const latestProduct = products.reduce((latest, product) => {
                const productDate = new Date(product.submittedDate || product.createdAt || product.dateAdded);
                return productDate > latest ? productDate : latest;
            }, new Date(0));
            lastActivity = latestProduct;
        }
        
        // Check latest order
        if (orders.length > 0) {
            const latestOrder = orders.reduce((latest, order) => {
                const orderDate = new Date(order.date);
                return orderDate > latest ? orderDate : latest;
            }, new Date(0));
            
            if (!lastActivity || latestOrder > lastActivity) {
                lastActivity = latestOrder;
            }
        }
        
        return lastActivity;
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-farms');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Export button
        const exportBtn = document.getElementById('export-farms');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToCSV());
        }

        // Search functionality
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterFarms();
            });
        }

        // Sort functionality
        this.setupTableSorting();
    }

    setupTableSorting() {
        const tableHeaders = document.querySelectorAll('th[data-sort]');
        tableHeaders.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                this.sortFarms(field);
            });
        });
    }

    sortFarms(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        
        this.filteredFarms.sort((a, b) => {
            let aValue = this.getNestedValue(a, field);
            let bValue = this.getNestedValue(b, field);
            
            // Handle different data types
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (aValue < bValue) return this.currentSort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.renderFarmsTable();
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current ? current[key] : null;
        }, obj);
    }

    filterFarms() {
        if (!this.searchTerm) {
            this.filteredFarms = [...this.farms];
        } else {
            this.filteredFarms = this.farms.filter(farm => 
                farm.farm.name.toLowerCase().includes(this.searchTerm) ||
                farm.owner.firstName.toLowerCase().includes(this.searchTerm) ||
                farm.owner.lastName.toLowerCase().includes(this.searchTerm) ||
                farm.owner.email.toLowerCase().includes(this.searchTerm) ||
                farm.farm.location.toLowerCase().includes(this.searchTerm)
            );
        }
        this.renderFarmsTable();
    }

    renderFarmsTable() {
        const tbody = document.getElementById('farms-table-body');
        if (!tbody) return;

        if (this.filteredFarms.length === 0) {
            tbody.innerHTML = this.renderEmptyState();
            return;
        }

        tbody.innerHTML = this.filteredFarms.map(farm => `
            <tr data-farm-id="${farm.id}">
                <td>
                    <div class="d-flex align-items-center">
                        ${farm.farm.avatar ? 
                            `<img src="${farm.farm.avatar}" alt="${farm.farm.name}" class="farm-logo me-3" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` : 
                            `<div class="farm-logo-placeholder me-3" style="width: 40px; height: 40px; border-radius: 8px; background: #007bff; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                                ${farm.farm.name.charAt(0)}
                            </div>`
                        }
                        <div>
                            <strong class="d-block">${farm.farm.name}</strong>
                            <small class="text-muted">${farm.farm.type}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <strong>${farm.owner.firstName} ${farm.owner.lastName}</strong>
                    <div class="text-muted small">${farm.owner.phone}</div>
                </td>
                <td>${farm.owner.email}</td>
                <td>
                    <strong class="text-success">$${farm.totalRevenue.toFixed(2)}</strong>
                </td>
                <td>
                    <strong class="text-warning">$${farm.adminCommission.toFixed(2)}</strong>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary view-farm" data-farm-id="${farm.id}" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning edit-farm" data-farm-id="${farm.id}" title="Edit Farm">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-farm" data-farm-id="${farm.id}" title="Delete Farm">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to action buttons
        this.setupActionButtons();
    }

    setupActionButtons() {
        // View farm details
        document.querySelectorAll('.view-farm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const farmId = e.target.closest('.view-farm').dataset.farmId;
                this.viewFarmDetails(farmId);
            });
        });

        // Edit farm
        document.querySelectorAll('.edit-farm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const farmId = e.target.closest('.edit-farm').dataset.farmId;
                this.editFarm(farmId);
            });
        });

        // Delete farm
        document.querySelectorAll('.delete-farm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const farmId = e.target.closest('.delete-farm').dataset.farmId;
                this.deleteFarm(farmId);
            });
        });
    }

    renderEmptyState() {
        return `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="text-muted">
                        <i class="bi bi-house display-1 d-block mb-3"></i>
                        <h4>No Farms Found</h4>
                        <p class="mb-3">There are no farm owners registered yet.</p>
                        <button class="btn btn-primary" onclick="adminFarmsManager.refreshData()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Data
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    updateStats() {
        const totalFarms = this.farms.length;
        const totalRevenue = this.farms.reduce((sum, farm) => sum + farm.totalRevenue, 0);
        const totalCommission = this.farms.reduce((sum, farm) => sum + farm.adminCommission, 0);
        const activeFarms = this.farms.filter(farm => 
            farm.status === 'active' && farm.totalOrders > 0
        ).length;

        document.getElementById('total-farms').textContent = totalFarms;
        document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
        document.getElementById('total-commission').textContent = `$${totalCommission.toFixed(2)}`;
        document.getElementById('active-farms').textContent = activeFarms;
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refresh-farms');
        if (refreshBtn) {
            const originalHtml = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i> Refreshing...';
            refreshBtn.disabled = true;
        }

        try {
            await this.loadFarms();
            this.renderFarmsTable();
            this.updateStats();
            this.showToast('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showToast('Error refreshing data', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
                refreshBtn.disabled = false;
            }
        }
    }

    viewFarmDetails(farmId) {
        const farm = this.farms.find(f => f.id === farmId);
        if (!farm) return;

        // Create and show farm details modal
        const modalHtml = `
            <div class="modal fade" id="farmDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-house me-2"></i>Farm Details - ${farm.farm.name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <!-- Farm Information -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-header">
                                            <h6 class="mb-0"><i class="bi bi-info-circle me-2"></i>Farm Information</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="text-center mb-4">
                                                ${farm.farm.avatar ? 
                                                    `<img src="${farm.farm.avatar}" alt="${farm.farm.name}" class="img-fluid rounded" style="max-height: 150px;">` : 
                                                    `<div class="bg-light rounded d-flex align-items-center justify-content-center mx-auto" style="width: 150px; height: 150px;">
                                                        <i class="bi bi-house display-4 text-muted"></i>
                                                    </div>`
                                                }
                                                <h4 class="mt-3">${farm.farm.name}</h4>
                                                <span class="badge bg-${farm.status === 'active' ? 'success' : farm.status === 'suspended' ? 'warning' : 'secondary'}">
                                                    ${farm.status || 'active'}
                                                </span>
                                            </div>
                                            <table class="table table-sm table-borderless">
                                                <tr>
                                                    <td width="30%"><strong>Type:</strong></td>
                                                    <td>${farm.farm.type}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Location:</strong></td>
                                                    <td>${farm.farm.location}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Size:</strong></td>
                                                    <td>${farm.farm.size || 'N/A'} acres</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Description:</strong></td>
                                                    <td>${farm.farm.description || 'No description provided'}</td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <!-- Owner Information -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-header">
                                            <h6 class="mb-0"><i class="bi bi-person me-2"></i>Owner Information</h6>
                                        </div>
                                        <div class="card-body">
                                            <table class="table table-sm table-borderless">
                                                <tr>
                                                    <td width="30%"><strong>Name:</strong></td>
                                                    <td>${farm.owner.firstName} ${farm.owner.lastName}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Email:</strong></td>
                                                    <td>${farm.owner.email}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Phone:</strong></td>
                                                    <td>${farm.owner.phone}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Registered:</strong></td>
                                                    <td>${new Date(farm.registeredAt).toLocaleDateString()}</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Last Activity:</strong></td>
                                                    <td>${farm.lastActivity ? new Date(farm.lastActivity).toLocaleDateString() : 'No activity'}</td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Business Statistics -->
                            <div class="row mt-4">
                                <div class="col-12">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0"><i class="bi bi-graph-up me-2"></i>Business Statistics</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row text-center">
                                                <div class="col-md-3 mb-3">
                                                    <div class="border rounded p-3">
                                                        <div class="text-success">
                                                            <i class="bi bi-currency-dollar display-6"></i>
                                                        </div>
                                                        <h4 class="text-success">$${farm.totalRevenue.toFixed(2)}</h4>
                                                        <small class="text-muted">Total Revenue</small>
                                                    </div>
                                                </div>
                                                <div class="col-md-3 mb-3">
                                                    <div class="border rounded p-3">
                                                        <div class="text-warning">
                                                            <i class="bi bi-wallet display-6"></i>
                                                        </div>
                                                        <h4 class="text-warning">$${farm.adminCommission.toFixed(2)}</h4>
                                                        <small class="text-muted">Admin Commission</small>
                                                    </div>
                                                </div>
                                                <div class="col-md-3 mb-3">
                                                    <div class="border rounded p-3">
                                                        <div class="text-info">
                                                            <i class="bi bi-cart display-6"></i>
                                                        </div>
                                                        <h4 class="text-info">${farm.totalOrders}</h4>
                                                        <small class="text-muted">Total Orders</small>
                                                    </div>
                                                </div>
                                                <div class="col-md-3 mb-3">
                                                    <div class="border rounded p-3">
                                                        <div class="text-primary">
                                                            <i class="bi bi-box display-6"></i>
                                                        </div>
                                                        <h4 class="text-primary">${farm.totalProducts}</h4>
                                                        <small class="text-muted">Total Products</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Recent Products & Orders -->
                            <div class="row mt-4">
                                <!-- Recent Products -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-header">
                                            <h6 class="mb-0"><i class="bi bi-box me-2"></i>Recent Products (Last 3)</h6>
                                        </div>
                                        <div class="card-body">
                                            ${this.renderRecentProducts(farm.recentProducts)}
                                        </div>
                                    </div>
                                </div>

                                <!-- Recent Orders -->
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-header">
                                            <h6 class="mb-0"><i class="bi bi-cart me-2"></i>Recent Orders (Last 3)</h6>
                                        </div>
                                        <div class="card-body">
                                            ${this.renderRecentOrders(farm.recentOrders)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-warning" onclick="adminFarmsManager.editFarm('${farm.id}')">
                                <i class="bi bi-pencil"></i> Edit Farm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('farmDetailsModal');
        if (existingModal) existingModal.remove();

        // Add modal to body and show it
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('farmDetailsModal'));
        modal.show();
    }

    renderRecentProducts(products) {
        if (!products || products.length === 0) {
            return `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-inbox display-4 d-block mb-2"></i>
                    <p>No products found</p>
                </div>
            `;
        }

        return `
            <div class="list-group list-group-flush">
                ${products.map(product => `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${product.name}</strong>
                            <div class="text-muted small">
                                $${parseFloat(product.price).toFixed(2)} • ${product.stock || 0} in stock
                            </div>
                        </div>
                        <span class="badge bg-${product.status === 'active' || product.status === 'approved' ? 'success' : product.status === 'pending' ? 'warning' : 'secondary'}">
                            ${product.status}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRecentOrders(orders) {
        if (!orders || orders.length === 0) {
            return `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-cart-x display-4 d-block mb-2"></i>
                    <p>No orders found</p>
                </div>
            `;
        }

        return `
            <div class="list-group list-group-flush">
                ${orders.map(order => {
                    const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const customerName = order.delivery?.location?.firstName + ' ' + order.delivery?.location?.lastName || 'Customer';
                    
                    return `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <strong>Order #${order.id.slice(-6)}</strong>
                                    <div class="text-muted small">
                                        ${customerName} • $${orderTotal.toFixed(2)}
                                    </div>
                                    <small class="text-muted">
                                        ${new Date(order.date).toLocaleDateString()}
                                    </small>
                                </div>
                                <span class="badge bg-${order.status === 'delivered' ? 'success' : order.status === 'shipped' ? 'info' : order.status === 'processing' ? 'warning' : 'secondary'}">
                                    ${order.status}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    editFarm(farmId) {
        const farm = this.farms.find(f => f.id === farmId);
        if (!farm) return;

        // Close details modal first
        const detailsModal = bootstrap.Modal.getInstance(document.getElementById('farmDetailsModal'));
        if (detailsModal) detailsModal.hide();

        // Create edit farm modal
        const modalHtml = `
            <div class="modal fade" id="editFarmModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Farm - ${farm.farm.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editFarmForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Farm Information</h6>
                                        <div class="mb-3">
                                            <label class="form-label">Farm Name</label>
                                            <input type="text" class="form-control" name="farmName" value="${farm.farm.name}" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Farm Type</label>
                                            <select class="form-control" name="farmType" required>
                                                <option value="crop" ${farm.farm.type === 'crop' ? 'selected' : ''}>Crop Farm</option>
                                                <option value="livestock" ${farm.farm.type === 'livestock' ? 'selected' : ''}>Livestock Farm</option>
                                                <option value="dairy" ${farm.farm.type === 'dairy' ? 'selected' : ''}>Dairy Farm</option>
                                                <option value="poultry" ${farm.farm.type === 'poultry' ? 'selected' : ''}>Poultry Farm</option>
                                                <option value="mixed" ${farm.farm.type === 'mixed' ? 'selected' : ''}>Mixed Farming</option>
                                                <option value="organic" ${farm.farm.type === 'organic' ? 'selected' : ''}>Organic Farm</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Location</label>
                                            <input type="text" class="form-control" name="location" value="${farm.farm.location}" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Owner Information</h6>
                                        <div class="mb-3">
                                            <label class="form-label">First Name</label>
                                            <input type="text" class="form-control" name="firstName" value="${farm.owner.firstName}" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Last Name</label>
                                            <input type="text" class="form-control" name="lastName" value="${farm.owner.lastName}" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" name="email" value="${farm.owner.email}" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Phone</label>
                                            <input type="tel" class="form-control" name="phone" value="${farm.owner.phone}" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-control" name="status">
                                        <option value="active" ${farm.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="suspended" ${farm.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                        <option value="inactive" ${farm.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" onclick="adminFarmsManager.suspendFarm('${farm.id}')">Suspend</button>
                            <button type="button" class="btn btn-primary" onclick="adminFarmsManager.saveFarmChanges('${farm.id}')">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('editFarmModal');
        if (existingModal) existingModal.remove();

        // Add modal to body and show it
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('editFarmModal'));
        modal.show();
    }

    saveFarmChanges(farmId) {
        const form = document.getElementById('editFarmForm');
        if (!form) return;

        const formData = new FormData(form);
        
        // Update farm data
        const farmIndex = this.farms.findIndex(f => f.id === farmId);
        if (farmIndex === -1) return;

        this.farms[farmIndex].farm.name = formData.get('farmName');
        this.farms[farmIndex].farm.type = formData.get('farmType');
        this.farms[farmIndex].farm.location = formData.get('location');
        this.farms[farmIndex].owner.firstName = formData.get('firstName');
        this.farms[farmIndex].owner.lastName = formData.get('lastName');
        this.farms[farmIndex].owner.email = formData.get('email');
        this.farms[farmIndex].owner.phone = formData.get('phone');
        this.farms[farmIndex].status = formData.get('status');

        // Save to localStorage
        this.saveFarmsToStorage();

        // Update UI
        this.renderFarmsTable();
        this.updateStats();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editFarmModal'));
        modal.hide();

        this.showToast('Farm updated successfully', 'success');
    }

    suspendFarm(farmId) {
        if (!confirm('Are you sure you want to suspend this farm? This will prevent them from adding new products and receiving orders.')) {
            return;
        }

        const farmIndex = this.farms.findIndex(f => f.id === farmId);
        if (farmIndex === -1) return;

        this.farms[farmIndex].status = 'suspended';
        this.saveFarmsToStorage();
        this.renderFarmsTable();

        this.showToast('Farm suspended successfully', 'warning');
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editFarmModal'));
        if (modal) modal.hide();
    }

    deleteFarm(farmId) {
        const farm = this.farms.find(f => f.id === farmId);
        if (!farm) return;

        if (!confirm(`Are you sure you want to delete ${farm.farm.name}? This action cannot be undone and will remove all farm data including products and orders.`)) {
            return;
        }

        // Remove farm from array
        this.farms = this.farms.filter(f => f.id !== farmId);
        this.filteredFarms = this.filteredFarms.filter(f => f.id !== farmId);

        // Save to storage
        this.saveFarmsToStorage();

        // Update UI
        this.renderFarmsTable();
        this.updateStats();

        this.showToast('Farm deleted successfully', 'success');
    }

    saveFarmsToStorage() {
        localStorage.setItem('allFarmOwners', JSON.stringify(this.farms));
    }

    exportToCSV() {
        if (this.farms.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }

        const headers = ['Farm Name', 'Owner Name', 'Email', 'Phone', 'Location', 'Type', 'Total Revenue', 'Admin Commission', 'Net Earnings', 'Total Orders', 'Active Products', 'Status', 'Registered Date'];
        
        const csvData = this.farms.map(farm => [
            `"${farm.farm.name}"`,
            `"${farm.owner.firstName} ${farm.owner.lastName}"`,
            `"${farm.owner.email}"`,
            `"${farm.owner.phone}"`,
            `"${farm.farm.location}"`,
            `"${farm.farm.type}"`,
            farm.totalRevenue.toFixed(2),
            farm.adminCommission.toFixed(2),
            farm.netEarnings.toFixed(2),
            farm.totalOrders,
            farm.activeProducts,
            `"${farm.status || 'active'}"`,
            `"${new Date(farm.registeredAt).toLocaleDateString()}"`
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farm_owners_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showToast('CSV exported successfully', 'success');
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.admin-toast');
        existingToasts.forEach(toast => toast.remove());

        const toastHtml = `
            <div class="admin-toast position-fixed top-0 end-0 m-3" style="z-index: 9999">
                <div class="toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'} border-0 show" role="alert">
                    <div class="d-flex">
                        <div class="toast-body">${message}</div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', toastHtml);

        // Auto remove after 3 seconds
        setTimeout(() => {
            const toast = document.querySelector('.admin-toast');
            if (toast) toast.remove();
        }, 3000);
    }
}

// Add CSS for spinning icon
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .farm-logo {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        object-fit: cover;
    }
    .farm-logo-placeholder {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: #007bff;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
    }
    th[data-sort]:hover {
        background-color: #f8f9fa;
    }
    .btn-group-sm .btn {
        padding: 0.25rem 0.5rem;
    }
`;
document.head.appendChild(style);

// Initialize the admin farms manager when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.adminFarmsManager = new AdminFarmsManager();
});