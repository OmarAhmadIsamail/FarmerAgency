// Get blog posts from localStorage (admin posts) or fallback to default
function getBlogPosts() {
    const adminPosts = JSON.parse(localStorage.getItem('blogPosts')) || [];
    
    // If no admin posts exist, use default posts
    if (adminPosts.length === 0) {
        const defaultPosts = [
            {
                id: 1,
                title: "The Future of Sustainable Farming",
                excerpt: "Discover how modern technology is revolutionizing sustainable farming practices and what it means for the future of agriculture.",
                content: `<p>Sustainable farming is no longer just a trend—it's a necessity for our planet's future...</p>`,
                image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2000&q=80",
                author: "Sarah Johnson",
                date: "2024-03-15",
                category: "Sustainable Farming",
                tags: ["sustainability", "technology", "farming", "innovation"],
                comments: 0,
                views: 0,
                readTime: 5,
                authorBio: "Sarah Johnson is a sustainable agriculture expert with over 15 years of experience in organic farming and environmental conservation."
            },
            {
                id: 2,
                title: "Organic Pest Control Methods",
                excerpt: "Learn effective and environmentally friendly ways to protect your crops from pests without harmful chemicals.",
                content: `<p>Organic pest control is essential for maintaining healthy crops while protecting the environment...</p>`,
                image: "https://images.unsplash.com/photo-1597848212624-e5d0e0e26343?auto=format&fit=crop&w=2000&q=80",
                author: "Mike Chen",
                date: "2024-03-10",
                category: "Organic Farming",
                tags: ["organic", "pest-control", "gardening", "environment"],
                comments: 0,
                views: 0,
                readTime: 4,
                authorBio: "Mike Chen is an organic farming specialist and the founder of GreenThumb Organics, dedicated to promoting chemical-free farming practices."
            },
            {
                id: 3,
                title: "Vertical Farming: Revolutionizing Urban Agriculture",
                excerpt: "How vertical farming is bringing fresh produce to city centers and reducing the carbon footprint of food transportation.",
                content: `<p>Vertical farming is transforming how we think about urban agriculture...</p>`,
                image: "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=2000&q=80",
                author: "Dr. Emily Rodriguez",
                date: "2024-03-05",
                category: "Urban Farming",
                tags: ["vertical-farming", "urban", "technology", "sustainability"],
                comments: 0,
                views: 0,
                readTime: 6,
                authorBio: "Dr. Emily Rodriguez is a leading researcher in urban agriculture and the director of the Urban Farming Innovation Center."
            },
            {
                id: 4,
                title: "Soil Health: The Foundation of Successful Farming",
                excerpt: "Understanding the importance of soil health and how to maintain fertile, productive soil for generations to come.",
                content: `<p>Healthy soil is the foundation of any successful farming operation...</p>`,
                image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=2000&q=80",
                author: "Robert Williams",
                date: "2024-02-28",
                category: "Soil Management",
                tags: ["soil-health", "farming", "sustainability", "agriculture"],
                comments: 0,
                views: 0,
                readTime: 5,
                authorBio: "Robert Williams is a soil scientist with 20 years of experience in agricultural research and soil conservation practices."
            },
            {
                id: 5,
                title: "The Rise of Agri-Tech Startups",
                excerpt: "How technology startups are transforming traditional farming practices with innovative solutions.",
                content: `<p>Agriculture technology startups are bringing fresh ideas...</p>`,
                image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2000&q=80",
                author: "Lisa Thompson",
                date: "2024-02-20",
                category: "Agricultural Technology",
                tags: ["agri-tech", "innovation", "startups", "technology"],
                comments: 0,
                views: 0,
                readTime: 4,
                authorBio: "Lisa Thompson is a technology journalist and agri-tech analyst, covering the intersection of agriculture and innovation."
            },
            {
                id: 6,
                title: "Water Conservation in Modern Agriculture",
                excerpt: "Innovative techniques and technologies that help farmers reduce water usage while maintaining crop yields.",
                content: `<p>Water scarcity is one of the biggest challenges facing modern agriculture...</p>`,
                image: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=2000&q=80",
                author: "David Martinez",
                date: "2024-02-15",
                category: "Water Management",
                tags: ["water-conservation", "irrigation", "sustainability", "farming"],
                comments: 0,
                views: 0,
                readTime: 5,
                authorBio: "David Martinez is a water resource engineer specializing in agricultural water management and conservation technologies."
            }
        ];
        localStorage.setItem('blogPosts', JSON.stringify(defaultPosts));
        return defaultPosts;
    }
    
    return adminPosts;
}

// Enhanced View Tracker - One view per user per post
class ViewTracker {
    trackView(postId) {
        const posts = getBlogPosts();
        const postIndex = posts.findIndex(post => post.id === postId);
        
        if (postIndex === -1) return;

        // Get user data
        const userData = this.getUserData();
        if (!userData) {
            // For guest users, use sessionStorage
            this.trackGuestView(postId);
            return;
        }

        // For logged-in users
        const userId = userData.id;
        const userViewedPosts = this.getUserViewedPosts(userId);
        
        // Check if user already viewed this post
        if (!userViewedPosts.includes(postId)) {
            // Increment view count
            if (!posts[postIndex].views) {
                posts[postIndex].views = 0;
            }
            posts[postIndex].views++;
            
            // Mark this post as viewed by user
            userViewedPosts.push(postId);
            this.setUserViewedPosts(userId, userViewedPosts);
            
            // Save updated posts
            localStorage.setItem('blogPosts', JSON.stringify(posts));
            
            console.log(`View tracked for post ${postId} by user ${userId}. Total views: ${posts[postIndex].views}`);
        }
    }

    trackGuestView(postId) {
        const guestViewedPosts = this.getGuestViewedPosts();
        
        if (!guestViewedPosts.includes(postId)) {
            const posts = getBlogPosts();
            const postIndex = posts.findIndex(post => post.id === postId);
            
            if (postIndex !== -1) {
                if (!posts[postIndex].views) {
                    posts[postIndex].views = 0;
                }
                posts[postIndex].views++;
                localStorage.setItem('blogPosts', JSON.stringify(posts));
                
                guestViewedPosts.push(postId);
                sessionStorage.setItem('guestViewedPosts', JSON.stringify(guestViewedPosts));
                
                console.log(`View tracked for post ${postId} by guest. Total views: ${posts[postIndex].views}`);
            }
        }
    }

    getUserData() {
        const userData = sessionStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    getUserViewedPosts(userId) {
        const allUserViews = JSON.parse(localStorage.getItem('userPostViews')) || {};
        return allUserViews[userId] || [];
    }

    setUserViewedPosts(userId, viewedPosts) {
        const allUserViews = JSON.parse(localStorage.getItem('userPostViews')) || {};
        allUserViews[userId] = viewedPosts;
        localStorage.setItem('userPostViews', JSON.stringify(allUserViews));
    }

    getGuestViewedPosts() {
        return JSON.parse(sessionStorage.getItem('guestViewedPosts')) || [];
    }
}

// Initialize View Tracker
const viewTracker = new ViewTracker();

// ✅ Initialize Blog Details after loading header/footer
document.addEventListener('DOMContentLoaded', function() {
    loadComponents().then(() => {
        initializeBlogDetails();
    });
});

// ✅ Load Header and Footer Components
function loadComponents() {
    return new Promise((resolve) => {
        fetch('components/header.html')
            .then(res => res.text())
            .then(data => {
                document.getElementById('header-container').innerHTML = data;
                if (typeof initMobileNavigation === 'function') initMobileNavigation();
            })
            .catch(err => console.error('Error loading header:', err))
            .finally(() => {
                fetch('components/footer.html')
                    .then(res => res.text())
                    .then(data => {
                        document.getElementById('footer-container').innerHTML = data;
                    })
                    .catch(err => console.error('Error loading footer:', err))
                    .finally(() => resolve());
            });
    });
}

// ✅ Blog details logic
function initializeBlogDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = parseInt(urlParams.get('id'));

    if (postId) {
        loadBlogPost(postId);
        
        // Track view after a short delay to ensure everything is loaded
        setTimeout(() => {
            viewTracker.trackView(postId);
        }, 1000);
    } else {
        window.location.href = 'blog.html';
    }

    loadSidebarContent();
    setupEventListeners();
}

// In the loadBlogPost function, update the comments section:
function loadBlogPost(postId) {
    const blogPosts = getBlogPosts();
    const post = blogPosts.find(p => p.id === postId);

    if (!post) {
        window.location.href = 'blog.html';
        return;
    }

    document.getElementById('blog-detail-title').textContent = post.title;
    document.getElementById('blog-detail-excerpt').textContent = post.excerpt;
    document.getElementById('blog-author').innerHTML = `<i class="bi bi-person"></i> By ${post.author}`;
    document.getElementById('blog-date').innerHTML = `<i class="bi bi-calendar"></i> ${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    document.getElementById('blog-category').innerHTML = `<i class="bi bi-folder"></i> ${post.category}`;
    document.getElementById('blog-comments').innerHTML = `<i class="bi bi-chat"></i> ${post.comments || 0} Comments`;
    document.getElementById('blog-featured-image').src = post.image;
    document.getElementById('blog-content').innerHTML = post.content;
    document.getElementById('author-bio').textContent = post.authorBio || "Farm expert and agricultural enthusiast with over 10 years of experience in sustainable farming practices.";
    document.getElementById('breadcrumb-current').textContent = post.title;

    const tagsContainer = document.getElementById('blog-tags');
    tagsContainer.innerHTML = '';
    if (post.tags && post.tags.length > 0) {
        post.tags.forEach(tag => {
            const el = document.createElement('a');
            el.href = 'blog.html';
            el.className = 'tag';
            el.textContent = tag;
            tagsContainer.appendChild(el);
        });
    }

    // Load comments using CommentManager
    setTimeout(() => {
        if (window.commentManager) {
            window.commentManager.loadComments();
        } else {
            console.log('CommentManager not available yet, retrying...');
            // Retry after a bit if CommentManager isn't loaded
            setTimeout(() => {
                if (window.commentManager) {
                    window.commentManager.loadComments();
                }
            }, 500);
        }
    }, 100);
}

function loadSidebarContent() {
    loadCategories('detail-categories-list');
    loadRecentPosts('detail-recent-posts');
    loadTags('detail-tags-container');
}

function loadCategories(containerId) {
    const container = document.getElementById(containerId);
    const posts = getBlogPosts();
    const categories = {};
    posts.forEach(p => (categories[p.category] = (categories[p.category] || 0) + 1));
    container.innerHTML = Object.entries(categories)
        .map(([c, n]) => `<li><a href="blog.html" data-category="${c}">${c}<span class="count">${n}</span></a></li>`)
        .join('');
}

function loadRecentPosts(containerId) {
    const container = document.getElementById(containerId);
    const posts = getBlogPosts();
    container.innerHTML = posts
        .slice(0, 3)
        .map(
            p => `
        <div class="recent-post">
            <div class="recent-post-img"><img src="${p.image}" alt="${p.title}"></div>
            <div class="recent-post-content">
                <h5><a href="blog-details.html?id=${p.id}">${p.title}</a></h5>
                <span><i class="bi bi-calendar"></i> ${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
        </div>`
        )
        .join('');
}

function loadTags(containerId) {
    const container = document.getElementById(containerId);
    const posts = getBlogPosts();
    const tags = [...new Set(posts.flatMap(p => p.tags || []))];
    container.innerHTML = tags.map(t => `<a href="blog.html" class="tag">${t}</a>`).join('');
}

// Updated setupEventListeners
function setupEventListeners() {
    // Comment form handler
    const form = document.getElementById('comment-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (window.commentManager) {
                window.commentManager.submitComment();
            } else {
                console.error('CommentManager not available');
                alert('Comment system is not available. Please refresh the page.');
            }
        });
    }

    // Add event listeners for category filtering in sidebar
    const categoryLinks = document.querySelectorAll('#detail-categories-list a[data-category]');
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category');
            // Store the selected category and redirect to blog page
            sessionStorage.setItem('selectedCategory', category);
            window.location.href = 'blog.html';
        });
    });

    // Add event listeners for tag filtering in sidebar
    const tagLinks = document.querySelectorAll('#detail-tags-container .tag');
    tagLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tag = this.textContent.trim();
            // Store the selected tag and redirect to blog page
            sessionStorage.setItem('selectedTag', tag);
            window.location.href = 'blog.html';
        });
    });

    // Add event listeners for blog detail page tags
    const blogDetailTags = document.querySelectorAll('#blog-tags .tag');
    blogDetailTags.forEach(tag => {
        tag.addEventListener('click', function(e) {
            e.preventDefault();
            const tagText = this.textContent.trim();
            sessionStorage.setItem('selectedTag', tagText);
            window.location.href = 'blog.html';
        });
    });

    // Debug button (remove in production)
    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Debug Comments';
    debugBtn.className = 'btn btn-sm btn-outline-secondary position-fixed';
    debugBtn.style.bottom = '10px';
    debugBtn.style.right = '10px';
    debugBtn.style.zIndex = '1000';
    debugBtn.addEventListener('click', function() {
        console.log('All Comments:', JSON.parse(localStorage.getItem('blogComments')));
        console.log('Current Post ID:', new URLSearchParams(window.location.search).get('id'));
        console.log('Comment Manager:', window.commentManager);
        console.log('Blog Posts:', getBlogPosts());
        console.log('View Tracker:', viewTracker);
        console.log('User Data:', sessionStorage.getItem('userData'));
        console.log('Guest Viewed Posts:', sessionStorage.getItem('guestViewedPosts'));
    });
    document.body.appendChild(debugBtn);
}

// Make functions available globally for debugging
window.getBlogPosts = getBlogPosts;
window.viewTracker = viewTracker;