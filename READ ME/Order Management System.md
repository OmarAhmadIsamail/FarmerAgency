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
│  admin-orders.js ◄─────────────────────────────┘            │
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
│  - View FARM orders only (filtered by farmId)               │
│  - Calculate farm earnings (85%)                            │
│  - View admin commission (15%)                              │
│  - Read-only order status                                   │
│         │           │                                       │
│         ▼           ▼                                       │
│  [orders] ◄────► [farmProducts]                             │
└──────────────────────────────────────────────────────────── ┘
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
  items: cart.map(item => ({
    ...item,
    farmId: item.farmId || getFarmIdFromProduct(item.id),
    farmName: item.farmName || getFarmNameFromProduct(item.id)
  })),
  paymentMethod: selectedPayment,
  delivery: {
    location: deliveryInfo,
    option: deliveryOption,
    fee: deliveryFee
  },
  totals: {
    subtotal: cartSubtotal,
    tax: cartSubtotal * 0.08,
    delivery: deliveryFee,
    discount: promoDiscount,
    total: finalTotal
  },
  promoCode: appliedPromoCode,
  status: 'pending',
  authType: 'registered'
};

// Save order
const orders = JSON.parse(localStorage.getItem('orders')) || [];
orders.push(order);
localStorage.setItem('orders', JSON.stringify(orders));
