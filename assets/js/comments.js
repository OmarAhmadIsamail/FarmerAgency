// Enhanced Comment Management System
class CommentManager {
    constructor() {
        this.currentPostId = this.getPostId();
        this.init();
    }

    init() {
        if (window.location.pathname.includes('blog-details.html') && this.currentPostId) {
            this.setupCommentForm();
            this.loadComments();
            this.setupReplyHandlers();
            this.updateCommentCounts(); // Initialize comment counts
        }
    }

    // Get current post ID from URL
    getPostId() {
        const urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('id'));
    }

    // Setup comment form
    setupCommentForm() {
        const form = document.getElementById('comment-form');
        if (form) {
            // Remove any existing event listeners
            form.replaceWith(form.cloneNode(true));
            
            // Get the fresh form reference
            const freshForm = document.getElementById('comment-form');
            freshForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitComment();
            });
        }
    }

    // Submit comment - ALL COMMENTS ARE NOW AUTO-APPROVED
    submitComment() {
        const name = document.getElementById('comment-name').value.trim();
        const email = document.getElementById('comment-email').value.trim();
        const text = document.getElementById('comment-text').value.trim();

        if (!name || !email || !text) {
            this.showNotification('Please fill in all fields.', 'danger');
            return;
        }

        // Validate email format
        if (!this.isValidEmail(email)) {
            this.showNotification('Please enter a valid email address.', 'danger');
            return;
        }

        const newComment = {
            id: Date.now(),
            postId: this.currentPostId,
            name: name,
            email: email,
            text: text,
            date: new Date().toISOString(),
            status: 'approved', // Auto-approve all comments
            replies: []
        };

        this.saveComment(newComment);
        this.loadComments();
        
        // Reset form
        document.getElementById('comment-form').reset();
        
        // Show success message
        this.showNotification('Comment posted successfully!', 'success');
        
        // Update comment count in the blog post
        this.updateBlogPostCommentCount();
        this.updateCommentCounts();
    }

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Save comment to localStorage
    saveComment(comment) {
        let comments = this.getAllComments();
        comments.unshift(comment); // Add to beginning for newest first
        localStorage.setItem('blogComments', JSON.stringify(comments));
        console.log('Comment saved:', comment);
    }

    // Get all comments from localStorage
    getAllComments() {
        const comments = JSON.parse(localStorage.getItem('blogComments')) || [];
        console.log('All comments from storage:', comments);
        return comments;
    }

    // Get comments for current post - ONLY APPROVED COMMENTS
    getPostComments() {
        const comments = this.getAllComments();
        const postComments = comments.filter(comment => 
            comment.postId === this.currentPostId && 
            comment.status === 'approved' // Only count approved comments
        );
        console.log('Approved comments for post', this.currentPostId, ':', postComments);
        return postComments;
    }

    // Update comment counts in UI
    updateCommentCounts() {
        const comments = this.getPostComments();
        const commentCount = comments.length;
        
        // Update all comment count elements
        const countElements = [
            document.getElementById('comments-count'),
            document.getElementById('comments-count-header'),
            document.querySelector('.comments h3 span')
        ];
        
        countElements.forEach(element => {
            if (element) {
                element.textContent = commentCount;
            }
        });

        // Update blog meta comment count
        const blogCommentsElement = document.getElementById('blog-comments');
        if (blogCommentsElement) {
            blogCommentsElement.innerHTML = `<i class="bi bi-chat"></i> ${commentCount} Comments`;
        }

        console.log('Updated comment count to:', commentCount);
    }

    // Load comments for current post - ONLY APPROVED COMMENTS
    loadComments() {
        const comments = this.getPostComments();
        const container = document.getElementById('comments-container');
        
        if (!container) {
            console.error('Comments container not found');
            return;
        }

        console.log('Loading approved comments:', comments);

        if (comments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-chat-square-text display-4 text-muted"></i>
                    <p class="text-muted mt-2">No comments yet. Be the first to comment!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = comments.map(comment => this.createCommentHTML(comment)).join('');
        this.setupReplyHandlers(); // Re-setup handlers after loading new comments
    }

    // Create comment HTML
    createCommentHTML(comment) {
        const commentDate = new Date(comment.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const hasReplies = comment.replies && comment.replies.length > 0;
        const repliesHTML = hasReplies ? 
            comment.replies.map(reply => this.createReplyHTML(reply)).join('') : '';

        return `
            <div class="comment" id="comment-${comment.id}">
                <div class="comment-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(comment.name)}&background=random&size=64" alt="${comment.name}">
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <h5>${this.escapeHtml(comment.name)}</h5>
                        <span class="comment-date">${commentDate}</span>
                    </div>
                    <div class="comment-text">
                        <p>${this.escapeHtml(comment.text)}</p>
                    </div>
                    
                    <!-- Show Replies Button (Only if there are replies) -->
                    ${hasReplies ? `
                        <div class="comment-actions">
                            <button type="button" class="btn btn-sm btn-outline-primary show-replies-btn" data-comment-id="${comment.id}">
                                <i class="bi bi-chat-text"></i> Show Replies (${comment.replies.length})
                            </button>
                        </div>
                    ` : ''}
                    
                    <!-- Replies List (Hidden by default) -->
                    ${hasReplies ? `
                        <div class="replies" id="replies-${comment.id}" style="display: none;">
                            ${repliesHTML}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Create reply HTML
    createReplyHTML(reply) {
        const replyDate = new Date(reply.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="comment reply">
                <div class="comment-avatar">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=007bff&color=fff&size=64" alt="Admin">
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <h6>Admin <span class="badge bg-primary">Admin</span></h6>
                        <span class="comment-date">${replyDate}</span>
                    </div>
                    <div class="comment-text">
                        <p>${this.escapeHtml(reply.text)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Setup reply functionality
    setupReplyHandlers() {
        // Remove existing event listeners
        document.querySelectorAll('.show-replies-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });

        // Add new event listeners for show replies buttons
        document.addEventListener('click', (e) => {
            // Show replies button click
            if (e.target.closest('.show-replies-btn')) {
                e.preventDefault();
                const commentId = e.target.closest('.show-replies-btn').dataset.commentId;
                this.toggleReplies(commentId);
            }
        });
    }

    // Toggle replies visibility
    toggleReplies(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        const showButton = document.querySelector(`.show-replies-btn[data-comment-id="${commentId}"]`);
        
        if (repliesContainer && showButton) {
            const isVisible = repliesContainer.style.display === 'block';
            
            if (isVisible) {
                repliesContainer.style.display = 'none';
                showButton.innerHTML = '<i class="bi bi-chat-text"></i> Show Replies';
                showButton.classList.remove('btn-primary');
                showButton.classList.add('btn-outline-primary');
            } else {
                repliesContainer.style.display = 'block';
                showButton.innerHTML = '<i class="bi bi-eye-slash"></i> Hide Replies';
                showButton.classList.remove('btn-outline-primary');
                showButton.classList.add('btn-primary');
            }
        }
    }

    // Update blog post comment count in blogPosts data - COUNT ONLY APPROVED COMMENTS
    updateBlogPostCommentCount() {
        const blogPosts = JSON.parse(localStorage.getItem('blogPosts')) || [];
        const postIndex = blogPosts.findIndex(post => post.id === this.currentPostId);
        
        if (postIndex !== -1) {
            const postComments = this.getPostComments(); // Only approved comments
            blogPosts[postIndex].comments = postComments.length;
            localStorage.setItem('blogPosts', JSON.stringify(blogPosts));
            
            console.log('Updated blog post comment count to:', postComments.length);
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.comment-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show comment-notification`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
        `;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize Comment Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing CommentManager...');
    window.commentManager = new CommentManager();
});

// Make CommentManager available globally
window.CommentManager = CommentManager;