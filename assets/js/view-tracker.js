// View Tracker - One view per account per post
class ViewTracker {
    constructor() {
        this.init();
    }

    init() {
        if (window.location.pathname.includes('blog-details.html')) {
            this.trackView();
        }
    }

    trackView() {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = parseInt(urlParams.get('id'));
        
        if (postId) {
            this.incrementView(postId);
        }
    }

    incrementView(postId) {
        const posts = this.getBlogPosts();
        const postIndex = posts.findIndex(post => post.id === postId);
        
        if (postIndex === -1) return;

        // Get or create viewed posts for this user
        const userViewedPosts = this.getUserViewedPosts();
        
        // Check if user already viewed this post
        if (!userViewedPosts.includes(postId)) {
            // Increment view count
            if (!posts[postIndex].views) {
                posts[postIndex].views = 0;
            }
            posts[postIndex].views++;
            
            // Mark this post as viewed by user
            userViewedPosts.push(postId);
            this.setUserViewedPosts(userViewedPosts);
            
            // Save updated posts
            localStorage.setItem('blogPosts', JSON.stringify(posts));
            
            console.log(`View tracked for post ${postId}. Total views: ${posts[postIndex].views}`);
        }
    }

    getBlogPosts() {
        return JSON.parse(localStorage.getItem('blogPosts')) || [];
    }

    getUserViewedPosts() {
        const userData = this.getUserData();
        if (!userData) return [];
        
        const userId = userData.id;
        const allUserViews = JSON.parse(localStorage.getItem('userPostViews')) || {};
        return allUserViews[userId] || [];
    }

    setUserViewedPosts(viewedPosts) {
        const userData = this.getUserData();
        if (!userData) return;
        
        const userId = userData.id;
        const allUserViews = JSON.parse(localStorage.getItem('userPostViews')) || {};
        allUserViews[userId] = viewedPosts;
        localStorage.setItem('userPostViews', JSON.stringify(allUserViews));
    }

    getUserData() {
        const userData = sessionStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    // For guest users (using sessionStorage)
    getGuestViewedPosts() {
        return JSON.parse(sessionStorage.getItem('guestViewedPosts')) || [];
    }

    setGuestViewedPosts(viewedPosts) {
        sessionStorage.setItem('guestViewedPosts', JSON.stringify(viewedPosts));
    }
}

// Initialize view tracker
document.addEventListener('DOMContentLoaded', function() {
    window.viewTracker = new ViewTracker();
});