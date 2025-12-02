// Analytics Manager Class
class AnalyticsManager {
    constructor() {
      this.currentFarm = null;
      this.currentPeriod = 'month';
      this.charts = {};
      this.cachedProducts = [];
      this.cachedOrders = [];
      this.init();
    }
  
    async init() {
      try {
        // Check authentication
        this.currentFarm = this.getCurrentFarm();
        if (!this.currentFarm) {
          this.showErrorMessage('Please login to access analytics');
          window.location.href = '../auth/login.html?redirect=owner/analytics.html';
          return;
        }
  
        // Load farm data
        this.loadFarmData();
        
        // Setup UI elements
        this.setupEventListeners();
        
        // Initialize charts
        this.initializeCharts();
        
        // Load analytics data
        await this.loadAnalyticsData();
        
      } catch (error) {
        console.error('Error initializing analytics:', error);
        this.showErrorMessage('Failed to initialize analytics. Please refresh the page.');
      }
    }
  
    getCurrentFarm() {
      try {
        const ownerData = localStorage.getItem('farmOwnerData');
        if (!ownerData) return null;
        
        const parsedData = JSON.parse(ownerData);
        if (!parsedData.isLoggedIn) return null;
        
        return parsedData;
      } catch (error) {
        console.error('Error getting farm data:', error);
        return null;
      }
    }
  
    loadFarmData() {
      if (this.currentFarm) {
        const farmName = this.currentFarm.farm?.name || 'Farm Name';
        const ownerName = this.currentFarm.name || 'Owner';
        
        document.getElementById('farm-name').textContent = farmName;
        document.getElementById('display-farm-name').textContent = farmName;
        document.getElementById('owner-name').textContent = ownerName;
      }
    }
  
    setupEventListeners() {
      // Period filter buttons
      const periodButtons = document.querySelectorAll('[data-period]');
      periodButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          periodButtons.forEach(btn => btn.classList.remove('active'));
          e.target.classList.add('active');
          
          this.currentPeriod = e.target.getAttribute('data-period');
          this.loadAnalyticsData();
        });
      });
    }
  
    async loadAnalyticsData() {
      try {
        this.showLoadingState();
  
        // Load data
        await this.preloadFarmData();
        
        // Calculate analytics
        const analyticsData = this.calculateAnalytics(this.cachedOrders, this.cachedProducts);
        
        // Update UI
        this.updateAnalyticsUI(analyticsData);
        
        // Update charts
        this.updateCharts(analyticsData);
        
      } catch (error) {
        console.error('Error loading analytics data:', error);
        this.showErrorMessage('Error loading analytics data. Please try refreshing.');
      } finally {
        this.hideLoadingState();
      }
    }
  
    async preloadFarmData() {
      try {
        this.cachedProducts = await this.getFarmProducts();
        this.cachedOrders = await this.getFarmOrders();
        
        console.log('Loaded:', {
          products: this.cachedProducts.length,
          orders: this.cachedOrders.length
        });
      } catch (error) {
        console.error('Error preloading farm data:', error);
        this.cachedProducts = [];
        this.cachedOrders = [];
      }
    }
  
    async getFarmOrders() {
      try {
        const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
        const farmOrders = allOrders.filter(order => {
          return order.items.some(item => this.isFarmProduct(item));
        });
        
        return farmOrders;
      } catch (error) {
        console.error('Error getting farm orders:', error);
        return [];
      }
    }
  
    isFarmProduct(item) {
      if (!this.currentFarm) return false;
      
      // Check multiple possible identifiers
      return (
        item.farmId === this.currentFarm.id ||
        item.farmName === this.currentFarm.farm?.name ||
        this.cachedProducts.some(product => product.id === item.id)
      );
    }
  
    async getFarmProducts() {
      try {
        let farmProducts = [];
        
        // Get from owner products
        const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
        const farmOwnerProducts = ownerProducts.filter(product => 
          product.farmId === this.currentFarm.id
        );
        
        // Get from IndexedDB (approved products)
        let dbProducts = [];
        try {
          dbProducts = await this.getProductsFromIndexedDB();
        } catch (error) {
          console.warn('Could not load products from IndexedDB:', error);
        }
        
        // Combine and deduplicate
        const allFarmProducts = [...farmOwnerProducts, ...dbProducts];
        farmProducts = allFarmProducts.filter((product, index, self) =>
          index === self.findIndex(p => p.id === product.id)
        );
        
        return farmProducts;
      } catch (error) {
        console.error('Error getting farm products:', error);
        return [];
      }
    }
  
    getProductsFromIndexedDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('FarmMarketDB', 4);
        
        request.onerror = () => reject('Error opening IndexedDB');
        
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('products')) {
            resolve([]);
            return;
          }
          
          const transaction = db.transaction(['products'], 'readonly');
          const store = transaction.objectStore('products');
          
          // Try to use farmId index
          if (store.indexNames.contains('farmId')) {
            const index = store.index('farmId');
            const getRequest = index.getAll(this.currentFarm.id);
            
            getRequest.onsuccess = () => resolve(getRequest.result || []);
            getRequest.onerror = () => {
              console.warn('IndexedDB index error, falling back to getAll');
              // Fallback to getAll
              const getAllRequest = store.getAll();
              getAllRequest.onsuccess = () => {
                const products = getAllRequest.result.filter(product => 
                  product.farmId === this.currentFarm.id
                );
                resolve(products);
              };
              getAllRequest.onerror = () => resolve([]);
            };
          } else {
            // Fallback: get all and filter
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const products = getAllRequest.result.filter(product => 
                product.farmId === this.currentFarm.id
              );
              resolve(products);
            };
            getAllRequest.onerror = () => resolve([]);
          }
        };
        
        request.onupgradeneeded = () => resolve([]);
      });
    }
  
    calculateAnalytics(orders, products) {
      // Filter orders by current period
      const periodOrders = this.filterOrdersByPeriod(orders, this.currentPeriod);
      
      // Calculate revenue data
      const revenueData = this.calculateRevenueData(periodOrders, products);
      const totalRevenue = revenueData.totalRevenue;
      const totalOrders = periodOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Calculate other metrics
      const customerCount = this.calculateCustomerCount(periodOrders);
      const netEarnings = totalRevenue * 0.85; // After 15% commission
      
      // Calculate detailed metrics
      const categorySales = this.calculateCategorySales(periodOrders, products);
      const orderStatus = this.calculateOrderStatus(periodOrders);
      const monthlyData = this.calculateMonthlyPerformance(orders, products);
      const productPerformance = this.calculateProductPerformance(revenueData.productItems);
      const comparisonData = this.calculatePeriodComparison(orders, products);
      
      return {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        customerCount,
        netEarnings,
        categorySales,
        orderStatus,
        monthlyData,
        productPerformance,
        comparisonData
      };
    }
  
    calculateRevenueData(orders, products) {
      let totalRevenue = 0;
      const productItems = [];
  
      orders.forEach(order => {
        let orderRevenue = 0;
        const orderProductItems = [];
  
        order.items.forEach(item => {
          if (this.isFarmProduct(item)) {
            const itemRevenue = item.price * item.quantity;
            orderRevenue += itemRevenue;
            
            // Track product performance
            const existingProduct = productItems.find(p => p.id === item.id);
            if (existingProduct) {
              existingProduct.unitsSold += item.quantity;
              existingProduct.revenue += itemRevenue;
            } else {
              const product = products.find(p => p.id === item.id) || {};
              productItems.push({
                id: item.id,
                name: item.name || product.name || 'Unknown Product',
                category: product.category || 'Unknown',
                unitsSold: item.quantity,
                revenue: itemRevenue,
                stock: product.stock || product.quantity || 0,
                price: item.price
              });
            }
  
            orderProductItems.push({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              revenue: itemRevenue
            });
          }
        });
  
        totalRevenue += orderRevenue;
      });
  
      return { totalRevenue, productItems };
    }
  
    calculateCustomerCount(orders) {
      const customers = new Set();
      orders.forEach(order => {
        if (order.delivery?.location?.email) {
          customers.add(order.delivery.location.email);
        } else if (order.customerEmail) {
          customers.add(order.customerEmail);
        } else if (order.userId) {
          customers.add(order.userId);
        }
      });
      return customers.size;
    }
  
    filterOrdersByPeriod(orders, period) {
      const now = new Date();
      let startDate;
      
      switch(period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      return orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= startDate && orderDate <= now;
      });
    }
  
    calculateCategorySales(orders, products) {
      const categoryMap = {};
      
      orders.forEach(order => {
        order.items.forEach(item => {
          if (this.isFarmProduct(item)) {
            const product = products.find(p => p.id === item.id) || {};
            const category = product.category || 'Unknown';
            const itemTotal = item.price * item.quantity;
            
            if (!categoryMap[category]) {
              categoryMap[category] = 0;
            }
            
            categoryMap[category] += itemTotal;
          }
        });
      });
  
      // Provide sample data if no categories found (for demo)
      if (Object.keys(categoryMap).length === 0) {
        return {
          'Vegetables': 500,
          'Fruits': 300,
          'Dairy': 200,
          'Grains': 150
        };
      }
      
      return categoryMap;
    }
  
    calculateOrderStatus(orders) {
      const statusCount = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
      };
      
      orders.forEach(order => {
        const status = order.status?.toLowerCase() || 'pending';
        if (statusCount[status] !== undefined) {
          statusCount[status]++;
        } else {
          statusCount.pending++;
        }
      });
      
      return statusCount;
    }
  
    calculateMonthlyPerformance(orders, products) {
      const monthlyData = {
        revenue: Array(12).fill(0),
        orders: Array(12).fill(0)
      };
      
      const currentYear = new Date().getFullYear();
      
      orders.forEach(order => {
        const orderDate = new Date(order.date);
        if (orderDate.getFullYear() === currentYear) {
          const month = orderDate.getMonth();
          
          monthlyData.orders[month]++;
          
          let orderRevenue = 0;
          order.items.forEach(item => {
            if (this.isFarmProduct(item)) {
              orderRevenue += item.price * item.quantity;
            }
          });
          
          monthlyData.revenue[month] += orderRevenue;
        }
      });
      
      return monthlyData;
    }
  
    calculateProductPerformance(productItems) {
      const performanceData = productItems.map(product => {
        let performance = 'Low';
        if (product.revenue > 500) performance = 'High';
        else if (product.revenue > 100) performance = 'Medium';
        
        return {
          ...product,
          performance
        };
      }).sort((a, b) => b.revenue - a.revenue);
  
      return performanceData;
    }
  
    calculatePeriodComparison(orders, products) {
      const currentPeriodOrders = this.filterOrdersByPeriod(orders, this.currentPeriod);
      const previousPeriodOrders = this.getPreviousPeriodOrders(orders, this.currentPeriod);
      
      const currentRevenue = this.calculateRevenueData(currentPeriodOrders, products).totalRevenue;
      const previousRevenue = this.calculateRevenueData(previousPeriodOrders, products).totalRevenue;
      
      const revenueGrowth = previousRevenue > 0 ? 
        ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 
        currentRevenue > 0 ? 100 : 0;
      
      const ordersGrowth = previousPeriodOrders.length > 0 ? 
        ((currentPeriodOrders.length - previousPeriodOrders.length) / previousPeriodOrders.length) * 100 : 
        currentPeriodOrders.length > 0 ? 100 : 0;
      
      const currentCustomers = this.calculateCustomerCount(currentPeriodOrders);
      const previousCustomers = this.calculateCustomerCount(previousPeriodOrders);
      const customersGrowth = previousCustomers > 0 ? 
        ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 
        currentCustomers > 0 ? 100 : 0;
  
      return {
        revenue: Math.round(revenueGrowth),
        orders: Math.round(ordersGrowth),
        customers: Math.round(customersGrowth)
      };
    }
  
    getPreviousPeriodOrders(orders, currentPeriod) {
      const now = new Date();
      let startDate, endDate;
      
      switch(currentPeriod) {
        case 'week':
          endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const previousQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
          const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
          startDate = new Date(year, previousQuarter * 3, 1);
          endDate = new Date(year, previousQuarter * 3 + 3, 0);
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      }
      
      return orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }
  
    updateAnalyticsUI(data) {
      // Update key metrics
      this.safeUpdateElement('total-revenue', `$${(data.totalRevenue || 0).toFixed(2)}`);
      this.safeUpdateElement('total-orders', data.totalOrders || 0);
      this.safeUpdateElement('avg-order-value', `$${(data.avgOrderValue || 0).toFixed(2)}`);
      this.safeUpdateElement('customer-count', data.customerCount || 0);
      this.safeUpdateElement('net-earnings', `$${(data.netEarnings || 0).toFixed(2)}`);
      
      // Update trends
      this.safeUpdateElement('revenue-trend', `+${(data.comparisonData?.revenue || 0)}%`);
      this.safeUpdateElement('orders-trend', `+${(data.comparisonData?.orders || 0)}%`);
      this.safeUpdateElement('aov-trend', '+5.2%'); // Static for demo
      this.safeUpdateElement('customer-trend', `+${(data.comparisonData?.customers || 0)}%`);
      this.safeUpdateElement('earnings-trend', `+${(data.comparisonData?.revenue || 0)}%`);
      
      // Update comparison cards
      this.safeUpdateElement('revenue-comparison', `+${(data.comparisonData?.revenue || 0)}%`);
      this.safeUpdateElement('orders-comparison', `+${(data.comparisonData?.orders || 0)}%`);
      this.safeUpdateElement('customer-comparison', `+${(data.comparisonData?.customers || 0)}%`);
      
      // Update product performance table
      this.updateProductPerformanceTable(data.productPerformance || []);
    }
  
    safeUpdateElement(id, value) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }
  
    updateProductPerformanceTable(products) {
      const tbody = document.getElementById('product-performance-body');
      if (!tbody) return;
      
      if (products.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-5">
              <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <p class="mb-2">No product performance data available</p>
                <small class="text-muted">Sales data will appear here when customers purchase your products</small>
              </div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = products.map(product => `
        <tr>
          <td><strong>${this.escapeHtml(product.name)}</strong></td>
          <td><span class="badge bg-light text-dark">${this.formatCategory(product.category)}</span></td>
          <td><span class="fw-semibold">${product.unitsSold}</span></td>
          <td><span class="text-success fw-semibold">$${product.revenue.toFixed(2)}</span></td>
          <td>
            <span class="badge ${product.stock > 10 ? 'bg-success' : product.stock > 0 ? 'bg-warning' : 'bg-danger'}">
              ${product.stock} units
            </span>
          </td>
          <td>
            <span class="performance-badge performance-${product.performance.toLowerCase()}">
              ${product.performance}
            </span>
          </td>
        </tr>
      `).join('');
    }
  
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  
    initializeCharts() {
      // Revenue Trend Chart
      const revenueCtx = document.getElementById('revenueChart');
      if (revenueCtx) {
        this.charts.revenue = new Chart(revenueCtx.getContext('2d'), {
          type: 'line',
          data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [
              {
                label: 'Revenue',
                data: [0, 0, 0, 0],
                borderColor: '#2c5530',
                backgroundColor: 'rgba(44, 85, 48, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2c5530',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
              },
              {
                label: 'Previous Period',
                data: [0, 0, 0, 0],
                borderColor: '#6c757d',
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                tension: 0.4,
                pointBackgroundColor: '#6c757d',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                  label: function(context) {
                    return `${context.dataset.label}: $${context.raw.toFixed(2)}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                  callback: function(value) {
                    return '$' + value;
                  }
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }
      
      // Category Sales Chart
      const categoryCtx = document.getElementById('categoryChart');
      if (categoryCtx) {
        this.charts.category = new Chart(categoryCtx.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: [],
            datasets: [{
              data: [],
              backgroundColor: [
                '#2c5530',
                '#4a7c59',
                '#6ba083',
                '#8dc3a7',
                '#a8d5ba',
                '#c4e7d4'
              ],
              borderWidth: 1,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 20,
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `$${context.raw.toFixed(2)} (${context.parsed}%)`;
                  }
                }
              }
            }
          }
        });
      }
      
      // Order Status Chart
      const orderStatusCtx = document.getElementById('orderStatusChart');
      if (orderStatusCtx) {
        this.charts.orderStatus = new Chart(orderStatusCtx.getContext('2d'), {
          type: 'pie',
          data: {
            labels: [],
            datasets: [{
              data: [],
              backgroundColor: [
                '#ffc107',
                '#17a2b8',
                '#6f42c1',
                '#28a745',
                '#dc3545',
                '#adb5bd'
              ],
              borderWidth: 1,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 20,
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              }
            }
          }
        });
      }
      
      // Monthly Performance Chart
      const monthlyCtx = document.getElementById('monthlyChart');
      if (monthlyCtx) {
        this.charts.monthly = new Chart(monthlyCtx.getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
              {
                label: 'Revenue',
                data: [],
                backgroundColor: '#2c5530',
                borderRadius: 4,
                order: 2
              },
              {
                label: 'Orders',
                data: [],
                backgroundColor: '#fd7e14',
                type: 'line',
                order: 1,
                tension: 0.4,
                borderWidth: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                  callback: function(value) {
                    return '$' + value;
                  }
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            }
          }
        });
      }
    }
  
    updateCharts(data) {
      // Update Revenue Chart
      if (this.charts.revenue) {
        const baseValue = data.totalRevenue / 4 || 0;
        const currentData = [
          baseValue * 0.8,
          baseValue * 1.2,
          baseValue * 0.9,
          baseValue * 1.1
        ];
        const previousData = currentData.map(value => value * 0.7);
        
        this.charts.revenue.data.datasets[0].data = currentData;
        this.charts.revenue.data.datasets[1].data = previousData;
        this.charts.revenue.update();
      }
      
      // Update Category Chart
      if (this.charts.category && data.categorySales) {
        const categories = Object.keys(data.categorySales);
        const sales = Object.values(data.categorySales);
        
        this.charts.category.data.labels = categories.map(cat => this.formatCategory(cat));
        this.charts.category.data.datasets[0].data = sales;
        this.charts.category.update();
      }
      
      // Update Order Status Chart
      if (this.charts.orderStatus && data.orderStatus) {
        const statuses = Object.keys(data.orderStatus);
        const counts = Object.values(data.orderStatus);
        
        this.charts.orderStatus.data.labels = statuses.map(status => this.formatStatus(status));
        this.charts.orderStatus.data.datasets[0].data = counts;
        this.charts.orderStatus.update();
      }
      
      // Update Monthly Chart
      if (this.charts.monthly && data.monthlyData) {
        this.charts.monthly.data.datasets[0].data = data.monthlyData.revenue;
        this.charts.monthly.data.datasets[1].data = data.monthlyData.orders;
        this.charts.monthly.update();
      }
    }
  
    showLoadingState() {
      const loadingElements = [
        'total-revenue', 'total-orders', 'avg-order-value', 
        'customer-count', 'net-earnings'
      ];
      
      loadingElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
        }
      });
    }
  
    hideLoadingState() {
      // Data updates will replace loading spinners
    }
  
    showErrorMessage(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-state';
      errorDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle"></i>
        <p class="mb-0">${message}</p>
      `;
      
      const main = document.querySelector('.owner-main');
      if (main) {
        const firstChild = main.firstElementChild;
        if (firstChild && firstChild.classList.contains('owner-header')) {
          main.insertBefore(errorDiv, firstChild.nextSibling);
        } else {
          main.insertBefore(errorDiv, main.firstChild);
        }
      }
    }
  
    formatCategory(category) {
      if (!category) return 'Uncategorized';
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
  
    formatStatus(status) {
      if (!status) return 'Unknown';
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
  
  // Initialize analytics when page loads
  document.addEventListener('DOMContentLoaded', function() {
    window.analyticsManager = new AnalyticsManager();
    
    // Export for manual refresh if needed
    window.refreshAnalytics = function() {
      window.analyticsManager.loadAnalyticsData();
    };
  });