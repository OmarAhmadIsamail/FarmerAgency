(function() {
  "use strict";

  /**
   * Apply .scrolled class to the body as the page is scrolled down
   */
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    if (!selectHeader.classList.contains('scroll-up-sticky') && !selectHeader.classList.contains('sticky-top') && !selectHeader.classList.contains('fixed-top')) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }

  document.addEventListener('scroll', toggleScrolled);
  window.addEventListener('load', toggleScrolled);

  /**
   * Mobile nav toggle
   */
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

  function mobileNavToogle() {
    document.querySelector('body').classList.toggle('mobile-nav-active');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
  }
  if (mobileNavToggleBtn) {
    mobileNavToggleBtn.addEventListener('click', mobileNavToogle);
  }

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    });
  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  
  if (scrollTop) {
    scrollTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    window.addEventListener('load', toggleScrollTop);
    document.addEventListener('scroll', toggleScrollTop);
  }

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 600,
        easing: 'ease-in-out',
        once: true,
        mirror: false
      });
    }
  }
  window.addEventListener('load', aosInit);

  /**
   * Auto generate the carousel indicators
   */
  document.querySelectorAll('.carousel-indicators').forEach((carouselIndicator) => {
    const carousel = carouselIndicator.closest('.carousel');
    if (carousel) {
      carousel.querySelectorAll('.carousel-item').forEach((carouselItem, index) => {
        if (index === 0) {
          carouselIndicator.innerHTML += `<li data-bs-target="#${carousel.id}" data-bs-slide-to="${index}" class="active"></li>`;
        } else {
          carouselIndicator.innerHTML += `<li data-bs-target="#${carousel.id}" data-bs-slide-to="${index}"></li>`;
        }
      });
    }
  });

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    if (typeof Swiper !== 'undefined') {
      document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
        let config = JSON.parse(
          swiperElement.querySelector(".swiper-config").innerHTML.trim()
        );

        if (swiperElement.classList.contains("swiper-tab")) {
          initSwiperWithCustomPagination(swiperElement, config);
        } else {
          new Swiper(swiperElement, config);
        }
      });
    }
  }

  window.addEventListener("load", initSwiper);

  /**
   * Initiate Pure Counter
   */
  if (typeof PureCounter !== 'undefined') {
    new PureCounter();
  }

  /**
   * Blog navigation in header
   */
  function setupBlogNavigation() {
    // Add blog link to navigation if it doesn't exist
    const navMenu = document.querySelector('#navmenu ul');
    if (navMenu && !document.querySelector('a[href="blog.html"]')) {
      const blogLink = document.createElement('li');
      blogLink.innerHTML = '<a href="blog.html">Blog</a>';
      navMenu.appendChild(blogLink);
    }
  }

  /**
   * Enhanced Add to Cart Function
   */
  function addToCart(productName, productPrice, productId, productCategory, productImage, productWeight) {
    // Check if user is authenticated
    if (typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
      window.location.href = './auth/login.html';
      return;
    }

    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Check if product already in cart
    const existingProduct = cart.find(item => item.id === productId);
    
    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        cart.push({
            id: productId || 'PROD' + Date.now(),
            name: productName,
            price: parseFloat(productPrice),
            category: productCategory || 'general',
            image: productImage || 'assets/img/products/product-1.jpg',
            weight: productWeight || '1kg',
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCounter();
  }

  /**
   * Cart functionality for all pages
   */
  function initializeCart() {
    // Only initialize cart if user is authenticated
    if (typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
      return;
    }

    function updateCartCounter() {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
      
      const cartCounter = document.querySelector('.cart-counter');
      if (cartCounter) {
        cartCounter.textContent = totalItems;
        cartCounter.classList.toggle('show', totalItems > 0);
      }
    }

    // Initialize cart counter on page load
    updateCartCounter();
  }

  /**
   * Products Filter and Cart Functionality
   */
  function initProductsFilterAndCart() {
    // Initialize cart functionality for all pages
    initializeCart();

    // Filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productItems = document.querySelectorAll('.product-item');
    
    if (filterButtons.length > 0 && productItems.length > 0) {
      filterButtons.forEach(button => {
        button.addEventListener('click', function() {
          // Remove active class from all buttons
          filterButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          this.classList.add('active');
          
          const filterValue = this.getAttribute('data-filter');
          
          productItems.forEach(item => {
            if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
              item.style.display = 'block';
              setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
              }, 100);
            } else {
              item.style.opacity = '0';
              item.style.transform = 'scale(0.8)';
              setTimeout(() => {
                item.style.display = 'none';
              }, 300);
            }
          });
        });
      });
    }
    
    // Add to cart functionality
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    
    if (addToCartButtons.length > 0) {
      addToCartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const productName = this.getAttribute('data-product');
          const productPrice = this.getAttribute('data-price');
          const productId = this.getAttribute('data-id');
          const productCategory = this.getAttribute('data-category');
          const productImage = this.getAttribute('data-image');
          const productWeight = this.getAttribute('data-weight');
          
          // Use the enhanced addToCart function
          addToCart(productName, productPrice, productId, productCategory, productImage, productWeight);
          
          // Show notification
          showCartNotification(productName);
        });
      });
    }
    
    function showCartNotification(productName) {
      // Create notification if it doesn't exist
      let notification = document.querySelector('.cart-notification');
      
      if (!notification) {
        notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
          <i class="bi bi-check-circle-fill"></i>
          <span class="notification-text"></span>
        `;
        document.body.appendChild(notification);
      }
      
      const notificationText = notification.querySelector('.notification-text');
      notificationText.textContent = `${productName} added to cart!`;
      
      notification.classList.add('show');
      
      setTimeout(() => {
        notification.classList.remove('show');
      }, 3000);
    }
    
    function updateCartCounter() {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
      
      // Update cart counter in header if it exists
      const cartCounter = document.querySelector('.cart-counter');
      if (cartCounter) {
        cartCounter.textContent = totalItems;
        cartCounter.classList.toggle('show', totalItems > 0);
      }
    }
  }

  // Initialize all functionality when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initProductsFilterAndCart();
      setupBlogNavigation(); // Add blog navigation setup
    });
  } else {
    initProductsFilterAndCart();
    setupBlogNavigation(); // Add blog navigation setup
  }
// Add this to your main.js file - AFTER all other code

/**
 * Initialize logout functionality
 */
function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Logout clicked from main.js');
          sessionStorage.removeItem('isLoggedIn');
          sessionStorage.removeItem('userData');
          window.location.href = 'auth/login.html';
      });
      console.log('Logout button initialized in main.js');
  }
}

// Initialize logout when everything is loaded
window.addEventListener('load', initLogout);
document.addEventListener('DOMContentLoaded', initLogout);

})();