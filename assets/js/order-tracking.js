// Order Tracking Module
const OrderTracking = (function() {
    // Private variables
    let currentOrderId = null;
    
    // Private methods
    function checkAuthForOrderTracking() {
      const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
      
      if (!isLoggedIn) {
        showGuestAccessModal();
      }
    }
    
    function showGuestAccessModal() {
      const guestModal = new bootstrap.Modal(document.getElementById('guestAccessModal'));
      guestModal.show();
    }
    
    function redirectToLogin() {
      window.location.href = 'auth/login.html?redirect=order-tracking';
    }
    
    function trackGuestOrder() {
      const orderId = document.getElementById('guest-order-id').value.trim();
      
      if (!orderId) {
        alert('Please enter an order ID');
        return;
      }
      
      const orders = JSON.parse(localStorage.getItem('orders')) || [];
      const order = orders.find(o => o.id === orderId);
      
      if (order) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('guestAccessModal'));
        if (modal) modal.hide();
        
        showOrderDetails(orderId);
      } else {
        alert('Order not found. Please check your order ID and try again.');
      }
    }
    
    function loadOrders(searchTerm = '') {
      const orders = JSON.parse(localStorage.getItem('orders')) || [];
      const ordersContainer = document.getElementById('orders-container');
      const noOrders = document.getElementById('no-orders');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
      const userData = isLoggedIn ? JSON.parse(sessionStorage.getItem('userData')) : null;
      
      // Filter orders based on auth status
      let filteredOrders = orders;
      
      if (isLoggedIn && userData) {
        filteredOrders = orders.filter(order => 
          order.userId === userData.id || order.userEmail === userData.email
        );
      } else {
        filteredOrders = [];
      }
      
      // Apply search filter if provided
      if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => 
          order.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Clear container
      ordersContainer.innerHTML = '';
      
      if (filteredOrders.length === 0) {
        noOrders.style.display = 'block';
        
        if (isLoggedIn) {
          noOrders.innerHTML = `
            <div class="text-center py-5">
              <i class="bi bi-cart-x display-1 text-muted"></i>
              <h4 class="mt-3">No Orders Yet</h4>
              <p class="text-muted">You haven't placed any orders yet.</p>
              <a href="product.html" class="btn btn-primary">Start Shopping</a>
            </div>
          `;
        } else {
          noOrders.innerHTML = `
            <div class="text-center py-5">
              <i class="bi bi-person display-1 text-muted"></i>
              <h4 class="mt-3">No Orders Found</h4>
              <p class="text-muted">Please log in to view your order history or use the search above to track a specific order.</p>
              <div class="d-flex gap-2 justify-content-center">
                <a href="auth/login.html?redirect=order-tracking" class="btn btn-primary">Login</a>
                <button class="btn btn-outline-primary" onclick="OrderTracking.showGuestModal()">Track Order</button>
              </div>
            </div>
          `;
        }
        return;
      }
      
      noOrders.style.display = 'none';
      
      // Sort orders by date (newest first)
      filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Display orders
      filteredOrders.forEach(order => {
        const orderCard = createOrderCard(order);
        ordersContainer.appendChild(orderCard);
      });
    }
    
    function createOrderCard(order) {
      const orderDate = new Date(order.date);
      const formattedDate = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const orderCard = document.createElement('div');
      orderCard.className = 'order-card';
      orderCard.innerHTML = `
        <div class="order-card-header">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-1">Order #${order.id}</h5>
              <p class="mb-0 text-muted">Placed on ${formattedDate}</p>
            </div>
            <div class="d-flex align-items-center gap-3">
              <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
              ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                <button class="delete-order-btn" data-order-id="${order.id}" title="Cancel Order">
                  <i class="bi bi-x-circle"></i>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="order-card-body">
          <div class="row">
            <div class="col-md-6">
              <p class="mb-1"><strong>Total:</strong> $${order.totals.total.toFixed(2)}</p>
              <p class="mb-0"><strong>Items:</strong> ${order.items.length} product(s)</p>
            </div>
            <div class="col-md-6 text-md-end">
              <button class="btn btn-outline-primary view-order-btn" data-order-id="${order.id}">
                View Details
              </button>
            </div>
          </div>
        </div>
      `;
      
      // Add event listeners
      orderCard.querySelector('.view-order-btn').addEventListener('click', function() {
        showOrderDetails(order.id);
      });
      
      const cancelBtn = orderCard.querySelector('.delete-order-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
          showCancelConfirmation(order.id);
        });
      }
      
      return orderCard;
    }
    
    function getStatusText(status) {
      const statusMap = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'processing': 'Processing',
        'shipped': 'Shipped',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
      };
      
      return statusMap[status] || status;
    }
    
    function showOrderDetails(orderId) {
      const orders = JSON.parse(localStorage.getItem('orders')) || [];
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        alert('Order not found');
        return;
      }
      
      currentOrderId = orderId;
      
      // Set modal content
      document.getElementById('modal-order-id').textContent = order.id;
      
      const orderDate = new Date(order.date);
      document.getElementById('modal-order-date').textContent = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      document.getElementById('modal-order-status').innerHTML = 
        `<span class="order-status status-${order.status}">${getStatusText(order.status)}</span>`;
      document.getElementById('modal-order-total').textContent = `$${order.totals.total.toFixed(2)}`;
      
      // Delivery information
      const delivery = order.delivery;
      document.getElementById('modal-delivery-address').textContent = 
        `${delivery.location.address}, ${delivery.location.city}, ${delivery.location.zipCode}, ${delivery.location.country}`;
      
      document.getElementById('modal-delivery-method').textContent = 
        delivery.option === 'express' ? 'Express Delivery' : 'Standard Delivery';
      
      const estimatedDate = new Date(order.date);
      estimatedDate.setDate(estimatedDate.getDate() + (delivery.option === 'express' ? 1 : 3));
      document.getElementById('modal-estimated-delivery').textContent = 
        estimatedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Order items
      const orderItemsContainer = document.getElementById('modal-order-items');
      orderItemsContainer.innerHTML = '';
      
      order.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'order-item';
        itemElement.innerHTML = `
          <img src="${item.image || 'assets/img/placeholder.jpg'}" alt="${item.name}" class="order-item-img">
          <div class="flex-grow-1">
            <h6 class="mb-1">${item.name}</h6>
            <p class="mb-0 text-muted">Quantity: ${item.quantity}</p>
            ${item.category ? `<p class="mb-0 text-muted small">Category: ${item.category}</p>` : ''}
          </div>
          <div class="text-end">
            <p class="mb-0">$${(item.price * item.quantity).toFixed(2)}</p>
            <p class="mb-0 text-muted small">$${item.price.toFixed(2)} each</p>
          </div>
        `;
        orderItemsContainer.appendChild(itemElement);
      });
      
      // Tracking timeline
      const timelineContainer = document.getElementById('modal-tracking-timeline');
      timelineContainer.innerHTML = createTrackingTimeline(order);
      
      // Show/hide cancel button based on order status
      const cancelBtn = document.getElementById('modal-delete-btn');
      if (order.status === 'delivered' || order.status === 'cancelled') {
        cancelBtn.style.display = 'none';
      } else {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancel Order';
        cancelBtn.className = 'btn btn-warning';
      }
      
      // Show modal
      const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
      modal.show();
    }
    
    function createTrackingTimeline(order) {
      const orderDate = new Date(order.date);
      const statusSteps = [
        { 
          status: 'pending', 
          title: 'Order Placed', 
          description: 'Your order has been received and is pending confirmation.',
          date: orderDate
        },
        { 
          status: 'confirmed', 
          title: 'Order Confirmed', 
          description: 'Your order has been confirmed and is being processed.',
          date: new Date(orderDate.getTime() + 2 * 60 * 60 * 1000)
        },
        { 
          status: 'processing', 
          title: 'Processing', 
          description: 'Your order is being prepared for shipment.',
          date: new Date(orderDate.getTime() + 4 * 60 * 60 * 1000)
        },
        { 
          status: 'shipped', 
          title: 'Shipped', 
          description: 'Your order has been shipped and is on its way.',
          date: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000)
        },
        { 
          status: 'delivered', 
          title: 'Delivered', 
          description: 'Your order has been delivered successfully.',
          date: new Date(orderDate.getTime() + (order.delivery.option === 'express' ? 24 : 72) * 60 * 60 * 1000)
        }
      ];
      
      let timelineHTML = '';
      
      statusSteps.forEach(step => {
        const isCompleted = getStatusLevel(order.status) >= getStatusLevel(step.status);
        const isActive = order.status === step.status;
        
        if (getStatusLevel(order.status) < getStatusLevel(step.status) && order.status !== 'cancelled') {
          return;
        }
        
        timelineHTML += `
          <div class="timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
            <h6 class="mb-1">${step.title}</h6>
            <p class="mb-1 small">${step.description}</p>
            <p class="mb-0 text-muted small">${step.date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        `;
      });
      
      if (order.status === 'cancelled') {
        timelineHTML += `
          <div class="timeline-step active">
            <h6 class="mb-1">Order Cancelled</h6>
            <p class="mb-1 small">Your order has been cancelled.</p>
            <p class="mb-0 text-muted small">${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        `;
      }
      
      return timelineHTML;
    }
    
    function getStatusLevel(status) {
      const statusLevels = {
        'pending': 1,
        'confirmed': 2,
        'processing': 3,
        'shipped': 4,
        'delivered': 5,
        'cancelled': 0
      };
      
      return statusLevels[status] || 0;
    }
    
    function searchOrder() {
      const searchTerm = document.getElementById('order-search').value.trim();
      loadOrders(searchTerm);
    }
    
    function showCancelConfirmation(orderId) {
      document.getElementById('delete-order-id').textContent = orderId;
      const confirmBtn = document.getElementById('confirm-delete-btn');
      confirmBtn.textContent = 'Cancel Order';
      confirmBtn.className = 'btn btn-warning';
      
      currentOrderId = orderId;
      
      const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
      modal.show();
      
      const orderDetailsModal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
      if (orderDetailsModal) {
        orderDetailsModal.hide();
      }
    }
    
    function cancelOrder() {
      if (!currentOrderId) return;
      
      const orders = JSON.parse(localStorage.getItem('orders')) || [];
      const orderIndex = orders.findIndex(order => order.id === currentOrderId);
      
      if (orderIndex !== -1) {
        orders[orderIndex].status = 'cancelled';
        localStorage.setItem('orders', JSON.stringify(orders));
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        modal.hide();
        
        loadOrders();
        showNotification('Order cancelled successfully', 'warning');
      }
    }
    
    function showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
      notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
      notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
    
    function loadHeader() {
      fetch('components/header.html')
        .then(response => response.text())
        .then(data => {
          document.getElementById('header-container').innerHTML = data;
          if (typeof initializeHeader === 'function') {
            initializeHeader();
          }
        })
        .catch(error => console.error('Error loading header:', error));
    }
    
    function loadFooter() {
      fetch('components/footer.html')
        .then(response => response.text())
        .then(data => {
          document.getElementById('footer-container').innerHTML = data;
        })
        .catch(error => console.error('Error loading footer:', error));
    }
    
    function setupEventListeners() {
      // Search button
      document.getElementById('search-btn').addEventListener('click', searchOrder);
      
      // Enter key in search field
      document.getElementById('order-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          searchOrder();
        }
      });
      
      // Cancel order button in modal
      document.getElementById('modal-delete-btn').addEventListener('click', function() {
        showCancelConfirmation(currentOrderId);
      });
      
      // Confirm cancel button
      document.getElementById('confirm-delete-btn').addEventListener('click', cancelOrder);
      
      // Guest modal buttons
      document.getElementById('guest-login-btn').addEventListener('click', redirectToLogin);
      document.getElementById('guest-track-btn').addEventListener('click', trackGuestOrder);
      
      // Enter key in guest order ID field
      document.getElementById('guest-order-id').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          trackGuestOrder();
        }
      });
    }
    
    // Public API
    return {
      init: function() {
        checkAuthForOrderTracking();
        loadHeader();
        loadFooter();
        loadOrders();
        setupEventListeners();
      },
      
      searchOrder: searchOrder,
      showOrderDetails: showOrderDetails,
      showGuestModal: showGuestAccessModal,
      reloadOrders: function(searchTerm = '') {
        loadOrders(searchTerm);
      }
    };
  })();
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    OrderTracking.init();
  });