# Order Management System Documentation

## 📋 System Overview

A complete order management system with Admin, Farm Owner, and Customer interfaces, using localStorage for persistence and managing multi-farm orders with commission tracking.

---

## 🗄️ Database Architecture

### Storage Strategy

| Storage | Purpose | Data |
|---------|---------|------|
| **localStorage (orders)** | All orders | Complete order history with status tracking |
| **localStorage (cart)** | Shopping cart | Active cart items before checkout |
| **localStorage (promoCodes)** | Promo codes | Active/inactive promotional codes |
| **sessionStorage (userData)** | User session | Current logged-in user information |
| **localStorage (farmProducts)** | Products | Available products for cart integration |

---

## 🔄 Order Lifecycle Flow

```
┌─────────────────┐
│   Customer      │
│   Adds to Cart  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  cart.js            │
│  CartManager        │
│  localStorage: cart │
└────────┬────────────┘
         │
         ▼
┌─────────────────┐
│  Checkout       │
│  checkout.js    │
└────┬────────────┘
     │
     ▼
┌──────────────────────┐
│  Order Created       │
│  localStorage:orders │
│  status: 'pending'   │
└────┬─────────────────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌──────────┐     ┌─────────────┐
│  Admin   │     │Farm Owner   │
│Views All │     │Views Own    │
│Orders    │     │Products Only│
└────┬─────┘     └─────────────┘
     │
     ▼
┌────────────────────┐
│ Status Updates     │
│ pending → confirmed│
│ confirmed → shipped│
│ shipped → delivered│
└────────────────────┘
     │
     ▼
┌─────────────────────┐
│Revenue Calculation  │
│Admin: 15% commission│
│Farm: 85% earnings   │
└─────────────────────┘
```

---

## 📁 File Structure & Classes

### 1. Cart Management (cart.js)

**Class:** `CartManager`

**Key Methods:**

| Method | Purpose | Storage Action |
|--------|---------|---------------|
| `initializeCart()` | Load cart from storage | Read from localStorage |
| `addItem(productId, quantity)` | Add product to cart | Write to localStorage (cart) |
| `updateQuantity(index, change)` | Update item quantity | Update localStorage (cart) |
| `removeItem(index)` | Remove item from cart | Update localStorage (cart) |
| `clearCart()` | Empty cart | Clear localStorage (cart) |
| `getSubtotal()` | Calculate cart total | Calculate from cart array |
| `getTotalItems()` | Count cart items | Sum quantities from cart |

**Cart Data Flow:**

```javascript
addItem(productId, quantity) {
  // 1. Get products from localStorage
  const products = JSON.parse(localStorage.getItem('farmProducts')) || [];
  const product = products.find(p => p.id === productId);
  
  // 2. Check if already in cart
  const existingItem = this.cart.findIndex(item => item.id === productId);
  
  if (existingItem !== -1) {
    // Update quantity
    this.cart[existingItem].quantity += quantity;
  } else {
    // Add new item
    this.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: quantity,
      farmId: product.farmId,        // Link to farm
      farmName: product.farmName      // Farm identification
    });
  }
  
  // 3. Save to localStorage
  localStorage.setItem('cart', JSON.stringify(this.cart));
  
  // 4. Update UI counter
  this.updateCartCounter();
}
```

### 2. Checkout System (checkout.js)

**Key Functions:**

| Function | Purpose | Integration |
|----------|---------|-------------|
| `checkAuthStatus()` | Verify user login | Read sessionStorage (userData) |
| `initializeCheckout()` | Setup checkout page | Read localStorage (cart) |
| `calculatePromoDiscount()` | Apply promo code | Read localStorage (promoCodes) |
| `placeOrder()` | Create order | Write localStorage (orders) |
| `incrementPromoUsage()` | Track promo usage | Update localStorage (promoCodes) |

**Order Creation Flow:**

```javascript
placeOrder() {
  // 1. Get cart data
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  // 2. Get user data (REQUIRED - must be logged in)
  const userData = JSON.parse(sessionStorage.getItem('userData'));
  
  // 3. Calculate totals with promo
  const subtotal = cart.reduce((total, item) => 
    total + (item.price * item.quantity), 0
  );
  
  const appliedPromoCode = localStorage.getItem('appliedPromoCode');
  let discount = 0;
  let freeShipping = false;
  
  if (appliedPromoCode) {
    const discountResult = calculatePromoDiscount(appliedPromoCode, subtotal);
    discount = discountResult.discount;
    freeShipping = discountResult.freeShipping;
  }
  
  const tax = subtotal * 0.08;
  let deliveryFee = freeShipping ? 0 : 
    (deliveryOption === 'express' ? 12.00 : 5.00);
  const total = subtotal + deliveryFee + tax - discount;
  
  // 4. Create order object
  const order = {
    id: 'FA-' + Date.now(),
    date: new Date().toISOString(),
    userId: userData.id,
    userEmail: userData.email,
    userName: `${userData.firstName} ${userData.lastName}`,
    items: cart,                    // Contains farmId & farmName per item
    paymentMethod: paymentMethod,
    delivery: {
      location: deliveryLocation,
      option: deliveryOption,
      fee: deliveryFee
    },
    totals: {
    subtotal: subtotal,
    tax: tax,
    delivery: deliveryFee,
    discount: discount,
    total: total
  },
  promoCode: appliedPromoCode || null,
  status: 'pending',
  authType: 'registered'
};

const orders = JSON.parse(localStorage.getItem('orders')) || [];
orders.push(order);
localStorage.setItem('orders', JSON.stringify(orders));

// Clear cart
localStorage.removeItem('cart');
```

### View Orders (Admin)

```javascript
// admin-orders.js - loadOrdersTable()
const orders = JSON.parse(localStorage.getItem('orders')) || [];

orders.forEach(order => {
  // Count unique farms in order
  const uniqueFarms = new Set(order.items.map(item => item.farmId).filter(id => id));
  
  // Display order with farm count
  displayOrderRow(order, uniqueFarms.size);
});
```

### View Orders (Farm Owner)

```javascript
// owner-orders.js - loadFarmOrders()
const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
const farmProducts = await getFarmProducts();

// Filter orders with farm's products
const farmOrders = allOrders.filter(order => {
  return order.items.some(item => 
    farmProducts.some(p => p.id === item.id) ||
    item.farmId === currentFarm.id
  );
});

// Calculate farm-specific values
farmOrders.forEach(order => {
  const values = calculateFarmOrderValues(order);
  displayOrderRow(order, values);
});
```

### Update Order Status (Admin)

```javascript
// admin-orders.js - updateStatus()
const orders = JSON.parse(localStorage.getItem('orders')) || [];
const order = orders.find(o => o.id === orderId);

order.status = newStatus;
localStorage.setItem('orders', JSON.stringify(orders));

// Stats automatically update based on delivered status
loadOrderStats();
```

### Apply Promo Code (Checkout)

```javascript
// checkout.js - calculatePromoDiscount()
const promoManager = window.promoManager;
const validation = promoManager.validatePromoCodeForCart(code, subtotal);

if (validation.valid) {
  const promo = validation.promo;
  
  switch (promo.type) {
    case 'percentage':
      discount = subtotal * (promo.value / 100);
      break;
    case 'fixed':
      discount = Math.min(promo.value, subtotal);
      break;
    case 'free_shipping':
      freeShipping = true;
      break;
  }
  
  // Store for order creation
  localStorage.setItem('appliedPromoCode', code);
  localStorage.setItem('promoDiscount', discount);
}
```

---

## 🔍 Debugging Tips

### Check All Orders

```javascript
// Browser console
const orders = JSON.parse(localStorage.getItem('orders'));
console.log('All orders:', orders);
console.log('Total orders:', orders.length);
```

### Check User's Orders

```javascript
const userData = JSON.parse(sessionStorage.getItem('userData'));
const orders = JSON.parse(localStorage.getItem('orders'));
const userOrders = orders.filter(o => o.userId === userData.id);
console.log('User orders:', userOrders);
```

### Check Farm Orders

```javascript
// In owner dashboard
ownerOrderManager.debugData();
// Shows: farm info, farm products, filtered orders, revenue stats
```

### Check Cart

```javascript
const cart = JSON.parse(localStorage.getItem('cart'));
console.log('Cart items:', cart);
console.log('Cart total:', cart.reduce((sum, item) => 
  sum + (item.price * item.quantity), 0
));
```

### Check Promo Codes

```javascript
const promoCodes = JSON.parse(localStorage.getItem('promoCodes'));
console.log('All promo codes:', promoCodes);
console.log('Active promos:', promoCodes.filter(p => p.status === 'active'));
```

### Check Revenue Calculation

```javascript
// Admin commission
const delivered = orders.filter(o => o.status === 'delivered');
const totalRevenue = delivered.reduce((sum, order) => 
  sum + order.totals.total, 0
);
const commission = totalRevenue * 0.15;
console.log('Admin commission:', commission);

// Farm earnings
const farmOrders = delivered.filter(order => 
  order.items.some(item => item.farmId === 'your-farm-id')
);
const farmRevenue = farmOrders.reduce((sum, order) => {
  const farmItems = order.items.filter(item => item.farmId === 'your-farm-id');
  return sum + farmItems.reduce((itemSum, item) => 
    itemSum + (item.price * item.quantity), 0
  );
}, 0);
const farmNet = farmRevenue * 0.85;
console.log('Farm net earnings:', farmNet);
```

---

## ⚡ Performance & Optimization

### Caching Strategy

- **In-Memory Cache**: OrderManager keeps orders array in memory
- **Lazy Loading**: Orders loaded only when needed
- **Filtered Views**: Pre-filter orders by status/farm for faster display
- **Event-Driven Updates**: Cart updates trigger counter refresh automatically

### Data Validation

```javascript
// Validate order before saving
function validateOrder(order) {
  // Required fields
  if (!order.id || !order.userId || !order.items || order.items.length === 0) {
    throw new Error('Invalid order: missing required fields');
  }
  
  // Valid status
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(order.status)) {
    throw new Error('Invalid order status');
  }
  
  // Valid totals
  if (order.totals.total < 0) {
    throw new Error('Invalid order total');
  }
  
  return true;
}
```

### Error Handling

```javascript
// Safe order operations
try {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  
  // Perform operation
  order.status = newStatus;
  
  // Save with validation
  if (validateOrder(order)) {
    localStorage.setItem('orders', JSON.stringify(orders));
  }
} catch (error) {
  console.error('Order operation failed:', error);
  showNotification('Failed to update order', 'error');
}
```

---

## 🎨 UI Integration Points

| Page | Component | Data Source | Function |
|------|-----------|-------------|----------|
| cart.html | CartManager | localStorage (cart) | Manage cart items |
| checkout.html | checkout.js | cart + promoCodes | Create order |
| admin/orders.html | OrderManager | localStorage (orders) | View/update all orders |
| owner/orders.html | OwnerOrderManager | orders + farmProducts | View farm orders only |
| order-tracking.html | order-tracking.js | orders (filtered by user) | Track order status |

---

## 📦 Order Item Tracking

### Item-Level Data Structure

```javascript
// Each item in order.items array
{
  // Product Info
  id: "product-123",
  name: "Organic Apples",
  category: "fruit",
  price: 12.00,
  quantity: 2,
  image: "base64_or_url",
  
  // Farm Info (CRITICAL for multi-farm orders)
  farmId: "owner-456",
  farmName: "Green Valley Farm",
  
  // Calculated (not stored, computed on-the-fly)
  itemTotal: 24.00,              // price * quantity
  adminCommission: 3.60,         // itemTotal * 0.15
  farmEarnings: 20.40           // itemTotal * 0.85
}
```

### Farm Order Filtering Logic

```javascript
// Three-way identification for robust filtering
function isItemFromFarm(item, farmId, farmName) {
  return (
    // Method 1: Direct farm ID match
    item.farmId === farmId ||
    
    // Method 2: Farm name match (fallback)
    item.farmName === farmName ||
    
    // Method 3: Product lookup
    farmProducts.some(product => product.id === item.id)
  );
}
```

---

## 🔐 Authentication Integration

### Required Authentication

```javascript
// Checkout requires login
function checkAuthStatus() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  
  if (!isLoggedIn) {
    alert('Please log in to proceed with checkout.');
    window.location.href = 'auth/login.html?redirect=checkout';
    return;
  }
}
```

### User Data in Orders

```javascript
// User info automatically added to orders
const userData = JSON.parse(sessionStorage.getItem('userData'));

const order = {
  ...orderData,
  userId: userData.id,           // For filtering user's orders
  userEmail: userData.email,     // Alternative identifier
  userName: `${userData.firstName} ${userData.lastName}`,
  authType: 'registered'         // Always registered (no guest checkout)
};
```

### Order Access Control

```javascript
// Users can only see their own orders
function loadUserOrders() {
  const userData = JSON.parse(sessionStorage.getItem('userData'));
  const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
  
  const userOrders = allOrders.filter(order => 
    order.userId === userData.id || order.userEmail === userData.email
  );
  
  return userOrders;
}

// Admins can see all orders
function loadAllOrders() {
  return JSON.parse(localStorage.getItem('orders')) || [];
}

// Farm owners can see orders with their products
function loadFarmOrders(farmId) {
  const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
  
  return allOrders.filter(order => 
    order.items.some(item => item.farmId === farmId)
  );
}
```

---

## 📊 Promo Code Data Structure

```javascript
{
  // Identification
  id: "promo_1234567890",
  code: "WELCOME10",
  
  // Type & Value
  type: "percentage",  // percentage|fixed|free_shipping
  value: 10,          // 10 for 10%, or dollar amount for fixed
  
  // Restrictions
  minOrder: 30.00,    // Minimum order value (null = no minimum)
  maxUses: 100,       // Maximum usage count (null = unlimited)
  
  // Status & Dates
  status: "active",   // active|inactive|expired
  startDate: "2025-01-15T00:00:00.000Z",
  expiryDate: "2025-12-31T23:59:59.000Z",
  
  // Usage Tracking
  usedCount: 15,
  
  // Additional Info
  description: "Welcome discount for new customers",
  createdAt: "2025-01-15T10:00:00.000Z",
  updatedAt: "2025-01-15T10:00:00.000Z"
}
```

---

## 🎯 Critical Business Rules

### 1. Revenue Recognition

**RULE**: Revenue is counted ONLY when order status is `delivered`

```javascript
// ❌ WRONG - Counts all orders
const revenue = orders.reduce((sum, order) => sum + order.totals.total, 0);

// ✅ CORRECT - Counts only delivered orders
const revenue = orders
  .filter(order => order.status === 'delivered')
  .reduce((sum, order) => sum + order.totals.total, 0);
```

### 2. Commission Split

**RULE**: Admin gets 15%, Farm gets 85% of item price

```javascript
// For each item in delivered orders
const itemTotal = item.price * item.quantity;
const adminCommission = itemTotal * 0.15;  // Admin gets 15%
const farmEarnings = itemTotal * 0.85;     // Farm gets 85%
```

### 3. Farm Order Filtering

**RULE**: Farm sees order if ANY item belongs to them

```javascript
// ✅ CORRECT - Show order if farm has any items in it
const farmOrders = orders.filter(order => 
  order.items.some(item => item.farmId === currentFarm.id)
);

// Then calculate ONLY farm's items
const farmItems = order.items.filter(item => item.farmId === currentFarm.id);
```

### 4. Order Status Flow

**RULE**: Status can only move forward (except cancel)

```javascript
// Valid transitions
pending → confirmed → shipped → delivered
any_status → cancelled  // Can cancel at any time (except delivered)

// Invalid transitions (should be prevented)
delivered → pending  // ❌ Cannot revert delivered orders
shipped → confirmed  // ❌ Cannot go backward
```

### 5. Promo Code Usage

**RULE**: Promo usage incremented ONLY when order is placed

```javascript
// ✅ CORRECT - Increment in placeOrder()
placeOrder() {
  // ... create order ...
  
  if (appliedPromoCode) {
    incrementPromoUsage(appliedPromoCode);
  }
}

// ❌ WRONG - Don't increment when validating
validatePromoCode() {
  // Just validate, don't increment here
}
```

### 6. User Order Access

**RULE**: Users can ONLY see their own orders

```javascript
// ✅ CORRECT - Filter by userId or userEmail
const userOrders = orders.filter(order => 
  order.userId === userData.id || order.userEmail === userData.email
);

// ❌ WRONG - Showing all orders to users
const userOrders = orders;  // Security issue!
```

---

## 🛠️ Troubleshooting Guide

### Issue: Farm not seeing their orders

**Diagnosis:**
```javascript
// Run in browser console
const farm = OwnerAuth.getCurrentFarm();
console.log('Farm ID:', farm.id);
console.log('Farm Name:', farm.farm?.name);

const orders = JSON.parse(localStorage.getItem('orders'));
orders.forEach(order => {
  console.log('Order:', order.id);
  order.items.forEach(item => {
    console.log('  Item farmId:', item.farmId);
    console.log('  Item farmName:', item.farmName);
  });
});
```

**Solution:** Ensure cart items have farmId and farmName when added

### Issue: Revenue not calculating correctly

**Diagnosis:**
```javascript
const orders = JSON.parse(localStorage.getItem('orders'));
const delivered = orders.filter(o => o.status === 'delivered');
console.log('Total orders:', orders.length);
console.log('Delivered orders:', delivered.length);
console.log('Revenue from delivered:', delivered.reduce((s, o) => s + o.totals.total, 0));
```

**Solution:** Check that only `delivered` orders are counted in revenue calculations

### Issue: Promo code not applying

**Diagnosis:**
```javascript
const promoCodes = JSON.parse(localStorage.getItem('promoCodes'));
const promo = promoCodes.find(p => p.code === 'YOUR_CODE');
console.log('Promo:', promo);
console.log('Status:', promo.status);
console.log('Start date:', new Date(promo.startDate));
console.log('Expiry date:', new Date(promo.expiryDate));
console.log('Current date:', new Date());
console.log('Used count:', promo.usedCount, '/', promo.maxUses);
```

**Solution:** Verify promo status is `active`, dates are valid, and usage limit not reached

### Issue: User can't checkout

**Diagnosis:**
```javascript
const isLoggedIn = sessionStorage.getItem('isLoggedIn');
const userData = sessionStorage.getItem('userData');
console.log('Logged in:', isLoggedIn);
console.log('User data:', userData);
```

**Solution:** User must be logged in for checkout. Redirect to login page.

---

## 📈 Statistics & Reporting

### Admin Dashboard Stats

```javascript
{
  totalOrders: 150,              // All orders
  pendingOrders: 25,             // Pending + confirmed
  completedOrders: 100,          // Delivered only
  cancelledOrders: 25,           // Cancelled
  totalRevenue: 15000.00,        // From delivered orders
  adminCommission: 2250.00,      // 15% of delivered
  netToFarms: 12750.00          // 85% of delivered
}
```

### Farm Dashboard Stats

```javascript
{
  totalOrders: 45,               // Orders with farm's products
  pendingOrders: 10,             // Pending + confirmed
  completedOrders: 30,           // Delivered only
  totalRevenue: 5100.00,         // Farm's items in delivered orders
  adminCommission: 765.00,       // 15% of farm revenue
  netEarnings: 4335.00          // 85% of farm revenue
}
```

### Customer Order History

```javascript
{
  totalOrders: 12,               // User's all orders
  activeOrders: 3,               // Not delivered or cancelled
  completedOrders: 8,            // Delivered
  cancelledOrders: 1,            // Cancelled
  totalSpent: 1250.00,          // From delivered orders
  totalSaved: 125.00            // From promo codes
}
```

---

## ✅ End of Documentation

**This document contains all essential information about the order management system's architecture, data flow, integration points, and business rules!**

### Quick Reference

- **Orders Storage**: `localStorage.getItem('orders')`
- **Cart Storage**: `localStorage.getItem('cart')`
- **Promo Storage**: `localStorage.getItem('promoCodes')`
- **User Session**: `sessionStorage.getItem('userData')`
- **Commission Rate**: 15% to admin, 85% to farm
- **Revenue Recognition**: Only on `delivered` status
- **Authentication**: Required for checkout and order tracking
      subtotal: subtotal,
      tax: tax,
      delivery: deliveryFee,
      discount: discount,
      total: total
    },
    promoCode: appliedPromoCode || null,
    status: 'pending',
    authType: 'registered'
  };
  
  // 5. Save order to localStorage
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  orders.push(order);
  localStorage.setItem('orders', JSON.stringify(orders));
  
  // 6. Clear cart and promo
  localStorage.removeItem('cart');
  localStorage.removeItem('appliedPromoCode');
  
  // 7. Update cart counter
  updateCartCounter();
}
```

### 3. Admin Order Management (admin-orders.js)

**Class:** `OrderManager`

**Key Methods:**

| Method | Purpose | Data Access |
|--------|---------|-------------|
| `loadOrdersTable()` | Display all orders | Read localStorage (orders) |
| `getOrderStats()` | Calculate statistics | Count & sum from orders |
| `getAdminCommissionStats()` | Calculate commission | 15% of delivered orders |
| `viewOrder(orderId)` | Show order details | Find order by ID |
| `updateStatus(orderId, status)` | Change order status | Update localStorage (orders) |
| `filterOrders()` | Search/filter orders | Filter orders array |

**Admin Statistics Calculation:**

```javascript
getOrderStats() {
  const totalOrders = this.orders.length;
  
  const pendingOrders = this.orders.filter(order => 
    order.status === 'pending' || order.status === 'confirmed'
  ).length;
  
  // CRITICAL: Only count delivered orders as completed
  const completedOrders = this.orders.filter(order => 
    order.status === 'delivered'
  ).length;
  
  // CRITICAL: Only count revenue from delivered orders
  const totalRevenue = this.orders
    .filter(order => order.status === 'delivered')
    .reduce((total, order) => total + order.totals.total, 0);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue
  };
}

getAdminCommissionStats() {
  const deliveredOrders = this.orders.filter(order => 
    order.status === 'delivered'
  );
  
  let totalCommission = 0;
  let totalRevenue = 0;

  deliveredOrders.forEach(order => {
    // Calculate commission from each item (15%)
    order.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      totalRevenue += itemTotal;
      totalCommission += itemTotal * 0.15;  // 15% commission
    });
  });

  return {
    totalRevenue: totalRevenue,
    totalCommission: totalCommission,
    netRevenue: totalRevenue - totalCommission
  };
}
```

**Status Update Flow:**

```javascript
updateStatus(orderId, newStatus) {
  const order = this.orders.find(o => o.id === orderId);
  
  if (order) {
    // Update status
    order.status = newStatus;
    
    // Save to localStorage
    this.saveOrders();
    
    // Reload UI components
    this.loadOrdersTable();
    this.loadOrderStats();
    this.updateDashboardStats();
  }
}
```

### 4. Owner Order Management (owner-orders.js)

**Class:** `OwnerOrderManager`

**Key Methods:**

| Method | Purpose | Data Access |
|--------|---------|-------------|
| `loadFarmOrders()` | Load farm's orders only | Filter orders by farmId |
| `getFarmProducts()` | Get farm's products | Read from multiple sources |
| `calculateFarmOrderValues()` | Calculate farm earnings | 85% after commission |
| `getFarmRevenueStats()` | Calculate farm revenue | Sum delivered orders only |
| `viewOrderDetails()` | Show order with earnings | Display with commission breakdown |

**Multi-Source Product Loading:**

```javascript
async getFarmProducts() {
  let farmProducts = [];
  
  // Method 1: Owner products (pending/approved)
  const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
  const farmOwnerProducts = ownerProducts.filter(product => 
    product.farmId === this.currentFarm.id
  );
  
  // Method 2: IndexedDB (approved products)
  const dbProducts = await this.getProductsFromIndexedDB();
  
  // Method 3: localStorage products (fallback)
  const allProducts = JSON.parse(localStorage.getItem('products')) || [];
  const localStorageProducts = allProducts.filter(product => 
    product.farmId === this.currentFarm.id
  );
  
  // Combine and remove duplicates
  const allFarmProducts = [...farmOwnerProducts, ...dbProducts, ...localStorageProducts];
  farmProducts = allFarmProducts.filter((product, index, self) =>
    index === self.findIndex(p => p.id === product.id)
  );
  
  return farmProducts;
}
```

**Farm Order Filtering:**

```javascript
loadFarmOrders() {
  const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
  const farmProducts = await this.getFarmProducts();
  
  // Filter orders containing this farm's products
  this.farmOrders = allOrders.filter(order => {
    return order.items.some(item => {
      // Check multiple identification methods
      return farmProducts.some(product => product.id === item.id) ||
             item.farmId === this.currentFarm.id ||
             item.farmName === this.currentFarm.farm?.name;
    });
  });
  
  this.displayFarmOrders();
  this.loadRevenueStats();
}
```

**Farm Revenue Calculation:**

```javascript
calculateFarmOrderValues(order) {
  const farmProducts = this.getFarmProductsSync();
  let farmSubtotal = 0;
  let farmItems = [];

  // Calculate totals ONLY for this farm's products
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
        itemTotal: itemTotal
      });
    }
  });

  // Calculate commission (15%) and net earnings (85%)
  const adminCommission = farmSubtotal * 0.15;
  const netEarnings = farmSubtotal - adminCommission;

  return {
    farmSubtotal,
    adminCommission,
    netEarnings,
    farmItems,
    itemCount: farmItems.length
  };
}

getFarmRevenueStats() {
  let totalRevenue = 0;
  let totalCommission = 0;
  let netEarnings = 0;
  
  // Count all orders
  const totalOrders = this.farmOrders.length;

  // CRITICAL: Calculate revenue ONLY from delivered orders
  const deliveredOrders = this.farmOrders.filter(order => 
    order.status === 'delivered'
  );
  
  deliveredOrders.forEach(order => {
    const farmValues = this.calculateFarmOrderValues(order);
    totalRevenue += farmValues.farmSubtotal;
    totalCommission += farmValues.adminCommission;
    netEarnings += farmValues.netEarnings;
  });

  return {
    totalOrders,           // All orders (any status)
    totalRevenue,          // Only delivered
    totalCommission,       // Only delivered
    netEarnings           // Only delivered
  };
}
```

### 5. Promo Code Management (promo-codes.js)

**Class:** `PromoManager`

**Key Methods:**

| Method | Purpose | Storage Action |
|--------|---------|---------------|
| `savePromoCodes()` | Save promo codes | Write localStorage (promoCodes) |
| `validatePromoCodeForCart()` | Check promo validity | Read & validate |
| `applyPromoCode()` | Apply discount | Increment usage counter |
| `autoSetPromoStatus()` | Update status by date | Check expiry/start dates |

**Promo Code Validation:**

```javascript
validatePromoCodeForCart(code, cartSubtotal) {
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
    return { 
      valid: false, 
      message: `Promo code starts on ${new Date(promo.startDate).toLocaleDateString()}` 
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

  // Increment usage count
  promo.usedCount = (promo.usedCount || 0) + 1;
  this.savePromoCodes();

  return {
    valid: true,
    discount: discount,
    freeShipping: freeShipping,
    promo: promo
  };
}
```

### 6. Order Tracking (order-tracking.html)

**Key Functions:**

| Function | Purpose | Data Access |
|----------|---------|-------------|
| `checkAuthForOrderTracking()` | Verify user authentication | Read sessionStorage |
| `loadOrders()` | Display user's orders | Filter by userId/email |
| `showOrderDetails()` | Display full order info | Find order by ID |
| `createTrackingTimeline()` | Show order progress | Generate timeline based on status |
| `cancelOrder()` | Mark order as cancelled | Update order status |

**User-Specific Order Loading:**

```javascript
loadOrders(searchTerm = '') {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  const userData = isLoggedIn ? JSON.parse(sessionStorage.getItem('userData')) : null;
  
  let filteredOrders = [];
  
  if (isLoggedIn && userData) {
    // Show orders for logged in user ONLY
    filteredOrders = orders.filter(order => 
      order.userId === userData.id || order.userEmail === userData.email
    );
  }
  
  // Apply search filter if provided
  if (searchTerm) {
    filteredOrders = filteredOrders.filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Sort by date (newest first)
  filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Display orders
  filteredOrders.forEach(order => {
    const orderCard = createOrderCard(order);
    ordersContainer.appendChild(orderCard);
  });
}
```

**Order Cancellation (User Side):**

```javascript
cancelOrder() {
  const orders = JSON.parse(localStorage.getItem('orders')) || [];
  const orderIndex = orders.findIndex(order => order.id === currentOrderId);
  
  if (orderIndex !== -1) {
    // Mark as cancelled (don't delete)
    orders[orderIndex].status = 'cancelled';
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Reload orders
    loadOrders();
    
    showNotification('Order cancelled successfully', 'warning');
  }
}
```

---

## 🔗 Component Integration Map

```
┌────────────────────────────────────────────────────────────┐
│                     CUSTOMER FLOW                          │
├────────────────────────────────────────────────────────────┤
│  product.html → cart.js → checkout.js → order-tracking.html│
│       │            │            │                │          │
│       ▼            ▼            ▼                ▼          │
│  [farmProducts] [cart]  [orders + promoCodes] [orders]    │
└─────────┬──────────────────────────────────────┬───────────┘
          │                                       │
┌─────────┼───────────────────────────────────────┼───────────┐
│         │          ADMIN PANEL                  │           │
├─────────┼───────────────────────────────────────┼───────────┤
│         ▼                                       │           │
│  admin-orders.js ◄─────────────────────────────┘           │
│  - View ALL orders                                          │
│  - Update order status                                      │
│  - Calculate admin commission (15%)                         │
│  - View orders by farm                                      │
│         │                                                   │
│         └───────────┐                                       │
├─────────────────────┼───────────────────────────────────────┤
│    FARM OWNER PANEL │                                       │
├─────────────────────┼───────────────────────────────────────┤
│         ▼           │                                       │
│  owner-orders.js    │                                       │
│  - View FARM orders only (filtered by farmId)              │
│  - Calculate farm earnings (85%)                            │
│  - View admin commission (15%)                              │
│  - Read-only order status                                   │
│         │           │                                       │
│         ▼           ▼                                       │
│  [orders] ◄────► [farmProducts]                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Order Data Structure

```javascript
{
  // Order Identification
  id: "FA-1234567890",
  date: "2025-01-15T10:30:00.000Z",
  
  // User Information (Required - from sessionStorage)
  userId: "user-123",
  userEmail: "user@example.com",
  userName: "John Doe",
  authType: "registered",  // registered (logged in users only)
  
  // Order Items (Contains farm information)
  items: [
    {
      id: "product-123",
      name: "Organic Apples",
      price: 12.00,
      quantity: 2,
      image: "base64_or_url",
      farmId: "owner-456",           // Links to farm
      farmName: "Green Valley Farm"  // Farm identification
    }
  ],
  
  // Payment Information
  paymentMethod: "card",  // cash|digital|card
  
  // Delivery Information
  delivery: {
    location: {
      firstName: "John",
      lastName: "Doe",
      email: "user@example.com",
      phone: "+1234567890",
      address: "123 Main St",
      city: "Springfield",
      zipCode: "12345",
      country: "USA",
      instructions: "Leave at door"
    },
    option: "standard",  // standard|express
    fee: 5.00
  },
  
  // Financial Breakdown
  totals: {
    subtotal: 24.00,
    tax: 1.92,
    delivery: 5.00,
    discount: 2.40,      // From promo code
    total: 28.52
  },
  
  // Promo Code
  promoCode: "WELCOME10",  // null if none applied
  
  // Order Status
  status: "pending"  // pending|confirmed|shipped|delivered|cancelled
}
```

---

## 💰 Commission & Revenue Calculation

### Admin Commission (15%)

```javascript
// Admin calculates commission from ALL delivered orders
deliveredOrders.forEach(order => {
  order.items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    const commission = itemTotal * 0.15;  // 15% commission
    totalCommission += commission;
  });
});
```

### Farm Earnings (85%)

```javascript
// Farm calculates earnings from THEIR products in delivered orders
deliveredOrders.forEach(order => {
  order.items.forEach(item => {
    // Check if this item belongs to this farm
    if (item.farmId === currentFarm.id) {
      const itemTotal = item.price * item.quantity;
      const commission = itemTotal * 0.15;
      const farmEarning = itemTotal - commission;  // 85% to farm
      totalFarmEarnings += farmEarning;
    }
  });
});
```

### Revenue Recognition Rules

| Status | Admin Counts? | Farm Counts? | Notes |
|--------|--------------|-------------|-------|
| `pending` | Order count only | Order count only | No revenue counted |
| `confirmed` | Order count only | Order count only | No revenue counted |
| `shipped` | Order count only | Order count only | No revenue counted |
| **`delivered`** | **✅ Full revenue** | **✅ Full revenue** | **Revenue recognized** |
| `cancelled` | Order count only | Order count only | No revenue counted |

---

## 🎯 Key Integration Points

### 1. Cart → Checkout → Order

```javascript
// Cart stores product info including farm data
const cartItem = {
  id: product.id,
  name: product.name,
  price: product.price,
  quantity: quantity,
  farmId: product.farmId,        // CRITICAL: Farm identification
  farmName: product.farmName     // CRITICAL: Farm identification
};

// Checkout creates order with cart items
const order = {
  id: 'FA-' + Date.now(),
  items: cart,  // Farm info preserved in items
  userId: userData.id,
  status: 'pending'
};

// Order saved to localStorage
localStorage.setItem('orders', JSON.stringify([...orders, order]));
```

### 2. Admin → Orders → Status Update

```javascript
// Admin views all orders
const allOrders = JSON.parse(localStorage.getItem('orders')) || [];

// Admin updates status
order.status = 'delivered';  // or 'confirmed', 'shipped', etc.
localStorage.setItem('orders', JSON.stringify(allOrders));

// Revenue automatically recalculated when status becomes 'delivered'
```

### 3. Owner → Orders → Farm Filter

```javascript
// Owner sees only orders with their products
const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
const farmProducts = getFarmProducts();

const farmOrders = allOrders.filter(order => {
  return order.items.some(item => 
    item.farmId === currentFarm.id ||
    farmProducts.some(p => p.id === item.id)
  );
});

// Calculate farm-specific values
farmOrders.forEach(order => {
  const farmItems = order.items.filter(item => item.farmId === currentFarm.id);
  const farmSubtotal = farmItems.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  );
  const commission = farmSubtotal * 0.15;
  const netEarnings = farmSubtotal - commission;
});
```

### 4. Promo Code → Checkout → Order

```javascript
// User applies promo code
const appliedPromo = promoManager.applyPromoCode(code, cartSubtotal);

if (appliedPromo.valid) {
  // Store promo info
  localStorage.setItem('appliedPromoCode', code);
  localStorage.setItem('promoDiscount', appliedPromo.discount);
  
  // Promo included in order
  const order = {
    ...orderData,
    promoCode: code,
    totals: {
      ...totals,
      discount: appliedPromo.discount
    }
  };
  
  // Increment promo usage
  promo.usedCount = (promo.usedCount || 0) + 1;
  localStorage.setItem('promoCodes', JSON.stringify(promoCodes));
}
```

---

## 📝 Order Status Values

| Status | Meaning | Who Can Set | Revenue Counted |
|--------|---------|------------|----------------|
| `pending` | Order received, awaiting confirmation | System (on creation) | ❌ No |
| `confirmed` | Admin confirmed order | Admin only | ❌ No |
| `shipped` | Order dispatched to customer | Admin only | ❌ No |
| `delivered` | Order successfully delivered | Admin only | ✅ Yes |
| `cancelled` | Order cancelled | Admin or Customer | ❌ No |

---

## 🔄 Multi-Farm Order Handling

### Order with Multiple Farms

```javascript
// Example order with products from 2 farms
{
  id: "FA-1234567890",
  items: [
    {
      id: "product-1",
      name: "Apples",
      price: 10.00,
      quantity: 2,
      farmId: "farm-A",
      farmName: "Green Valley Farm"
    },
    {
      id: "product-2",
      name: "Tomatoes",
      price: 8.00,
      quantity: 3,
      farmId: "farm-B",
      farmName: "Sunny Acres"
    }
  ],
  totals: {
    subtotal: 44.00,  // (10*2) + (8*3)
    total: 50.00
  }
}
```

### Admin View

```javascript
// Admin sees FULL order
{
  orderTotal: 50.00,
  adminCommission: 7.50,  // 15% of 50.00
  farmsInvolved: 2,
  breakdown: {
    "farm-A": { subtotal: 20.00, commission: 3.00, net: 17.00 },
    "farm-B": { subtotal: 24.00, commission: 3.60, net: 20.40 }
  }
}
```

### Farm A View

```javascript
// Farm A sees ONLY their products
{
  orderTotal: 20.00,        // Only their items
  adminCommission: 3.00,    // 15% of 20.00
  netEarnings: 17.00,       // 85% of 20.00
  items: [
    { name: "Apples", price: 10.00, quantity: 2 }
  ]
}
```

### Farm B View

```javascript
// Farm B sees ONLY their products
{
  orderTotal: 24.00,        // Only their items
  adminCommission: 3.60,    // 15% of 24.00
  netEarnings: 20.40,       // 85% of 24.00
  items: [
    { name: "Tomatoes", price: 8.00, quantity: 3 }
  ]
}
```

---

## 🚀 Quick Implementation Guide

### Create Order (Checkout)

```javascript
// checkout.js - placeOrder()
const order = {
  id: 'FA-' + Date.now(),
  date: new Date().toISOString(),
  userId: userData.id,
  userEmail: userData.email,
  userName: `${userData.firstName} ${userData.lastName}`,
  items: cart,  // Includes farmId and farmName
  paymentMethod: selectedPayment,
  delivery: {
    location: deliveryInfo,
    option: deliveryOption,
    fee: deliveryFee
  },
  totals: {