# Product Management System Documentation

## 📋 System Overview

A complete product management system with Admin and Farm Owner interfaces, using IndexedDB for persistence and localStorage for pending approvals.

---

## 🗄️ Database Architecture

### IndexedDB Configuration

```javascript
Database: 'FarmMarketDB'
Version: 4
Store: 'products'
Indexes: ['name', 'category', 'status', 'farmId']
```

### Storage Strategy

| Storage | Purpose | Data |
|---------|---------|------|
| **IndexedDB** | Approved products | Active/approved products from admin & owners |
| **localStorage (ownerProducts)** | Pending review | Products awaiting admin approval |
| **localStorage (cart)** | Shopping cart | User cart items |

---

## 🔄 Product Lifecycle Flow

```
┌─────────────────┐
│  Farm Owner     │
│  Creates Product│
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  localStorage       │
│  status: 'pending'  │
└────────┬────────────┘
         │
         ▼
┌─────────────────┐
│  Admin Reviews  │
│  products.html  │
└────┬────────┬───┘
     │        │
Approve    Reject
     │        │
     ▼        ▼
┌─────────┐  ┌──────────────┐
│IndexedDB│  │localStorage  │
│active   │  │status:rejected│
└────┬────┘  └──────────────┘
     │
     ▼
┌─────────────┐
│Public Site  │
│product.html │
└─────────────┘
```

---

## 📁 File Structure & Classes

### 1. Admin System (admin.js)

**Class:** `ProductManager`

**Key Methods:**

| Method | Purpose | Database Action |
|--------|---------|----------------|
| `openDatabase()` | Initialize IndexedDB | Create/open DB |
| `addDefaultProducts()` | Seed initial data | Write to IndexedDB |
| `loadProducts()` | Get all products | Read from IndexedDB |
| `approveProduct(id)` | Approve pending product | Write to IndexedDB + Remove from localStorage |
| `rejectProduct(id)` | Reject with reason | Update localStorage status |
| `updateProductInDB()` | Edit product | Update IndexedDB |
| `deleteProductFromDB()` | Remove product | Delete from IndexedDB |
| `loadOwnerProductsForApproval()` | Show pending products | Read localStorage + IndexedDB |

**Admin Approval Flow:**

```javascript
approveProduct(productId) {
  // 1. Get from localStorage (ownerProducts)
  const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts'));
  const product = ownerProducts.find(p => p.id === productId);
  
  // 2. Change status & add farm info
  product.status = 'active';
  product.approvedDate = new Date().toISOString();
  
  // 3. Save to IndexedDB
  await this.addProductToDB(product);
  
  // 4. Remove from localStorage
  ownerProducts.splice(index, 1);
  localStorage.setItem('ownerProducts', JSON.stringify(ownerProducts));
}
```

### 2. Owner System (owner-product.js)

**Class:** `OwnerProductManager`

**Key Methods:**

| Method                        | Purpose                    | Storage Action                           |
|-------------------------------|----------------------------|------------------------------------------|
| `addNewProduct()`             | Submit new product         | Write to localStorage (pending)          |
| `saveOwnerProduct()`          | Store pending product      | localStorage write                       |
| `getApprovedProductsFromDB()` | Get approved products      | Read from IndexedDB (filtered by farmId) |
| `loadOwnerProducts()`         | Display all owner products | Read localStorage + IndexedDB            |
| `getProductStats()`           | Calculate statistics       | Count pending/approved/rejected          |
| `deleteProduct(id)`           | Remove product             | Delete from localStorage or IndexedDB    |
  
**Product Submission Flow:**

```javascript
addNewProduct() {
  // 1. Gather form data
  const newProduct = {
    id: this.generateProductId(),
    name, category, price, images,
    status: 'pending',  // Key status
    farmId: this.ownerData.id,  // Link to owner
    farmName: this.ownerData.farm.name,
    submittedDate: new Date().toISOString()
  };
  
  // 2. Save to localStorage (pending approval)
  const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
  ownerProducts.push(newProduct);
  localStorage.setItem('ownerProducts', JSON.stringify(ownerProducts));
}
```

### 3. Public Display (product.js)

**Class:** `ProductDisplay`

**Key Methods:**

| Method | Purpose | Data Source |
|--------|---------|-------------|
| `loadProductsFromDB()` | Load with fallbacks | Try 3 methods (see below) |
| `loadProductsDirectly()` | Direct DB access | IndexedDB transaction |
| `loadProductsFromLocalStorage()` | Fallback method | localStorage read |
| `createProductCard()` | Generate HTML | Render product card |
| `applyFilter()` | Category filter | DOM manipulation |
| `searchProducts()` | Search functionality | String matching |

**Multi-Source Loading Strategy:**

```javascript
async loadProductsFromDB() {
  let products = [];
  
  // Method 1: Try ProductManager (if admin.js loaded)
  if (window.productManager) {
    products = window.productManager.getAllProducts();
  }
  
  // Method 2: Direct IndexedDB access
  if (products.length === 0) {
    products = await this.loadProductsDirectly();
  }
  
  // Method 3: localStorage fallback
  if (products.length === 0) {
    products = this.loadProductsFromLocalStorage();
  }
  
  // Filter only active products
  return products.filter(p => p.status === 'active' || p.status === 'approved');
}
```

### 4. Product Details (product-details.js)

**Class:** `ProductDetails`

**Key Methods:**

| Method | Purpose | Integration |
|--------|---------|------------|
| `loadProductsFromDB()` | Load products | Same 3-method fallback |
| `loadProductDetails()` | Get product by URL param | ?id=product-id |
| `displayProductDetails()` | Render full info | Update DOM |
| `addToCart()` | Add to cart | Call CartManager.addItem() |
| `fallbackAddToCart()` | Fallback cart | Direct localStorage write |
| `loadProductImages()` | Handle multiple images | Swiper initialization |

**Cart Integration:**

```javascript
addToCart() {
  const quantity = parseInt(document.querySelector('.quantity-input').value);
  
  // Primary: Use CartManager
  if (window.cartManager) {
    window.cartManager.addItem(this.currentProduct.id, quantity);
  } 
  // Fallback: Direct localStorage
  else {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItem = {
      id: this.currentProduct.id,
      name: this.currentProduct.name,
      price: this.currentProduct.price,
      image: this.currentProduct.images[0],
      quantity: quantity
    };
    cart.push(cartItem);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}
```

---

## 🔗 Component Integration Map

```
┌──────────────────────────────────────────────────────┐
│                   PUBLIC SITE                        │
├──────────────────────────────────────────────────────┤
│  product.html          product-details.html          │
│  ProductDisplay  ───►  ProductDetails                │
│       │                      │                        │
│       ├──────────────────────┴─────────┐            │
│       ▼                                ▼            │
│  IndexedDB ◄────────────────────► localStorage      │
│       ▲                                ▲            │
│       │                                │            │
├───────┼────────────────────────────────┼────────────┤
│       │         ADMIN PANEL            │            │
├───────┼────────────────────────────────┼────────────┤
│       │                                │            │
│  products.html                    ownerProducts     │
│  ProductManager ──────────────────────┘            │
│       │ approve/reject                              │
│       └─────────────┐                               │
├─────────────────────┼───────────────────────────────┤
│     OWNER PANEL     │                               │
├─────────────────────┼───────────────────────────────┤
│  add-product.html   │                               │
│  OwnerProductManager└──► ownerProducts (localStorage)│
└──────────────────────────────────────────────────────┘
```

---

## 📊 Product Data Structure

```javascript
{
  // Basic Info
  id: "owner-product-1234567890",
  name: "Fresh Organic Apples",
  category: "fruit", // fruit|vegetable|seed|meat|equipment
  price: 12.00,
  description: "Fresh, crisp organic apples...",
  
  // Images (Max 6)
  images: ["base64_img1", "base64_img2"],
  image: "base64_img1", // Main image (first)
  
  // Details
  details: {
    weight: "1kg",
    origin: "Local Farm"
  },
  organic: true,
  shelfLife: "2-3 weeks",
  features: ["100% Organic", "Locally Grown"],
  stock: 100,
  
  // Status & Tracking
  status: "pending", // pending|active|approved|rejected
  
  // Farm Owner Products Only
  farmId: "owner-123",
  farmName: "Green Valley Farm",
  submittedDate: "2025-01-15T10:30:00.000Z",
  lastUpdated: "2025-01-15T10:30:00.000Z",
  
  // Rejection (if applicable)
  rejectionReason: "Image quality too low"
}
```

---

## 🔧 Critical Functions Reference

### Admin Functions

```javascript
// Approve product
productManager.approveProduct(productId)
→ Moves from localStorage to IndexedDB
→ Changes status to 'active'
→ Refreshes product display

// Reject product
productManager.rejectProduct(productId)
→ Updates status in localStorage
→ Adds rejection reason

// Delete product
productManager.deleteProductFromDB(productId)
→ Removes from IndexedDB
→ Updates UI
```

### Owner Functions

```javascript
// Add new product
ownerProductManager.addNewProduct()
→ Validates form data
→ Converts images to base64
→ Saves to localStorage (pending)

// Get owner statistics
ownerProductManager.getProductStats()
→ Counts: total, pending, approved, rejected
→ Returns stats object

// Load owner products
ownerProductManager.loadOwnerProducts()
→ Combines localStorage + IndexedDB
→ Filters by farmId
```

### Display Functions

```javascript
// Load products (public)
productDisplay.loadProductsFromDB()
→ Tries 3 loading methods
→ Filters active products only
→ Renders product cards

// Filter by category
productDisplay.applyFilter('fruit')
→ Shows/hides products by category

// Search products
productDisplay.searchProducts('apple')
→ Filters by name/category match
```

### Details Functions

```javascript
// Load single product
productDetails.loadProductDetails()
→ Gets ID from URL: ?id=product-123
→ Finds product in loaded data
→ Displays full details

// Add to cart
productDetails.addToCart()
→ Uses CartManager (primary)
→ Falls back to localStorage
→ Shows notification
```

---

## 🎯 Key Integration Points

### 1. Admin ↔ Owner Products

```javascript
// Owner submits
localStorage.setItem('ownerProducts', JSON.stringify([{
  id: 'owner-123',
  status: 'pending',
  farmId: 'farm-456'
}]));

// Admin approves
const pending = JSON.parse(localStorage.getItem('ownerProducts'));
const approved = pending[0];
approved.status = 'active';

// Save to IndexedDB
const transaction = db.transaction(['products'], 'readwrite');
transaction.objectStore('products').add(approved);

// Remove from localStorage
pending.splice(0, 1);
localStorage.setItem('ownerProducts', JSON.stringify(pending));
```

### 2. Display ↔ Database

```javascript
// Public site loads products
async function loadForDisplay() {
  // Get all active products
  const products = await getAllActiveProducts();
  
  // Filter by status
  const active = products.filter(p => 
    p.status === 'active' || p.status === 'approved'
  );
  
  // Render
  active.forEach(product => createProductCard(product));
}
```

### 3. Details ↔ Cart

```javascript
// Product details adds to cart
function addToCart(productId, quantity) {
  // Get product from memory
  const product = this.products.find(p => p.id === productId);
  
  // Create cart item
  const cartItem = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images[0],
    quantity: quantity
  };
  
  // Save to cart
  if (window.cartManager) {
    cartManager.addItem(productId, quantity);
  } else {
    // Fallback
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push(cartItem);
    localStorage.setItem('cart', JSON.stringify(cart));
  }
}
```

---

## 🚀 Quick Implementation Guide

### Initialize Product System

```javascript
// 1. Initialize ProductManager (admin.js - loads automatically)
const productManager = new ProductManager();
// Creates IndexedDB, loads default products

// 2. Initialize OwnerProductManager (owner pages)
const ownerProductManager = new OwnerProductManager();
// Checks authentication, loads owner data

// 3. Initialize ProductDisplay (public pages)
const productDisplay = new ProductDisplay();
// Loads and displays active products

// 4. Initialize ProductDetails (detail page)
const productDetails = new ProductDetails();
// Loads single product by ID from URL
```

### Add Product (Owner)

```javascript
// owner-product.js
async addNewProduct() {
  const product = {
    id: generateId(),
    name: document.getElementById('product-name').value,
    price: parseFloat(document.getElementById('product-price').value),
    images: await collectImages(),
    status: 'pending',
    farmId: this.ownerData.id,
    submittedDate: new Date().toISOString()
  };
  
  const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts')) || [];
  ownerProducts.push(product);
  localStorage.setItem('ownerProducts', JSON.stringify(ownerProducts));
}
```

### Approve Product (Admin)

```javascript
// admin.js
async approveProduct(productId) {
  const ownerProducts = JSON.parse(localStorage.getItem('ownerProducts'));
  const product = ownerProducts.find(p => p.id === productId);
  
  product.status = 'active';
  product.approvedDate = new Date().toISOString();
  
  await this.addProductToDB(product);
  
  ownerProducts = ownerProducts.filter(p => p.id !== productId);
  localStorage.setItem('ownerProducts', JSON.stringify(ownerProducts));
}
```

### Display Products (Public)

```javascript
// product.js
async loadProducts() {
  const products = await this.loadProductsFromDB();
  const active = products.filter(p => p.status === 'active');
  
  active.forEach(product => {
    const card = this.createProductCard(product);
    document.getElementById('products-grid').appendChild(card);
  });
}
```

---

## 📝 Status Values Reference

| Status | Location | Meaning | Action Needed |
|--------|----------|---------|---------------|
| `pending` | localStorage | Awaiting admin review | Admin approve/reject |
| `active` | IndexedDB | Live on site | None - displayed publicly |
| `approved` | IndexedDB | Same as active | None - displayed publicly |
| `rejected` | localStorage | Declined by admin | Owner can edit/resubmit |
| `inactive` | IndexedDB | Hidden from public | Admin can reactivate |

---

## 🔍 Debugging Tips

### Check Products in IndexedDB

```javascript
// Open browser console
const request = indexedDB.open('FarmMarketDB', 4);
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('products', 'readonly');
  const store = tx.objectStore('products');
  const getAll = store.getAll();
  getAll.onsuccess = () => console.log(getAll.result);
};
```

### Check Pending Products

```javascript
console.log(JSON.parse(localStorage.getItem('ownerProducts')));
```

### Check Cart

```javascript
console.log(JSON.parse(localStorage.getItem('cart')));
```

---

## ⚡ Performance Notes

- **Lazy Loading:** Products load only when page loads
- **In-Memory Cache:** ProductManager keeps products in memory
- **Batch Operations:** Bulk approve/reject supported
- **Fallback Chain:** 3-level fallback ensures data availability
- **Event-Driven Updates:** Cart uses custom events for real-time sync

---

## 🎨 UI Integration Points

| Page | Component | Data Source | Function |
|------|-----------|-------------|----------|
| admin/products.html | ProductManager | IndexedDB + localStorage | Approve/reject/edit |
| owner/products.html | OwnerProductManager | localStorage + IndexedDB | View own products |
| owner/add-product.html | OwnerProductManager | Form → localStorage | Submit new product |
| product.html | ProductDisplay | IndexedDB (active only) | Browse products |
| product-details.html | ProductDetails | IndexedDB | View single product |

---

## ✅ End of Documentation

**This document contains all the essential information about your product system's architecture, data flow, and integration points!**