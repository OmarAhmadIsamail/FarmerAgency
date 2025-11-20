// Admin Blog Management
class AdminBlogManager {
    constructor() {
        this.blogPosts = this.getBlogPosts();
        this.currentEditId = null;
        this.init();
    }

    getBlogPosts() {
        return JSON.parse(localStorage.getItem('blogPosts')) || [];
    }

    init() {
        if (window.location.pathname.includes('blog.html')) {
            this.loadBlogPosts();
            this.updateBlogStats();
            this.setupEditModal();
        }
        
        if (window.location.pathname.includes('add-blog.html')) {
            this.setupAddBlogForm();
        }
    }

    // Load blog posts for admin table
    loadBlogPosts() {
        const tableBody = document.getElementById('blog-posts-table');
        if (!tableBody) return;

        // Refresh posts data
        this.blogPosts = this.getBlogPosts();

        if (this.blogPosts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="bi bi-journal-text display-4 text-muted d-block mb-2"></i>
                        <h5>No blog posts found</h5>
                        <p class="text-muted">Get started by adding your first blog post.</p>
                        <a href="add-blog.html" class="btn btn-primary">
                            <i class="bi bi-plus-circle me-2"></i>Add First Post
                        </a>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.blogPosts.map(post => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${post.image}" alt="${post.title}" class="rounded me-3" style="width: 60px; height: 40px; object-fit: cover;">
                        <div>
                            <h6 class="mb-0">${post.title}</h6>
                            <small class="text-muted">${post.excerpt.substring(0, 50)}...</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark">${post.category}</span>
                </td>
                <td>${post.author}</td>
                <td>${new Date(post.date).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${post.status === 'published' ? 'success' : 'warning'}">
                        ${post.status}
                    </span>
                </td>
                <td>
                    <span class="badge bg-info">${post.comments || 0}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <a href="../blog-details.html?id=${post.id}" class="btn btn-outline-primary" target="_blank">
                            <i class="bi bi-eye"></i>
                        </a>
                        <button class="btn btn-outline-warning" onclick="adminBlog.openEditModal(${post.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="adminBlog.deletePost(${post.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Update blog statistics - COUNT ONLY APPROVED COMMENTS
    updateBlogStats() {
        // Refresh posts data
        this.blogPosts = this.getBlogPosts();
        
        // Get all comments and filter only approved ones
        const allComments = JSON.parse(localStorage.getItem('blogComments')) || [];
        const approvedComments = allComments.filter(comment => comment.status === 'approved');
        
        // Count comments per post (only approved ones)
        const commentCountByPost = {};
        approvedComments.forEach(comment => {
            if (!commentCountByPost[comment.postId]) {
                commentCountByPost[comment.postId] = 0;
            }
            commentCountByPost[comment.postId]++;
        });
        
        // Update post comment counts and calculate totals
        let totalPosts = this.blogPosts.length;
        let totalComments = 0;
        let totalViews = 0;
        
        this.blogPosts.forEach(post => {
            // Update post comment count with approved comments only
            post.comments = commentCountByPost[post.id] || 0;
            totalComments += post.comments;
            totalViews += (post.views || 0);
        });
        
        // Save updated posts back to localStorage
        localStorage.setItem('blogPosts', JSON.stringify(this.blogPosts));
        
        const categories = new Set(this.blogPosts.map(post => post.category)).size;

        // Update DOM elements
        const totalPostsEl = document.getElementById('total-posts');
        const totalCommentsEl = document.getElementById('total-comments');
        const totalViewsEl = document.getElementById('total-views');
        const totalCategoriesEl = document.getElementById('total-categories');

        if (totalPostsEl) totalPostsEl.textContent = totalPosts;
        if (totalCommentsEl) totalCommentsEl.textContent = totalComments;
        if (totalViewsEl) totalViewsEl.textContent = totalViews;
        if (totalCategoriesEl) totalCategoriesEl.textContent = categories;
        
        console.log('Blog stats updated:', {
            totalPosts,
            totalComments,
            totalViews,
            categories,
            approvedComments: approvedComments.length
        });
    }

    // Setup add blog form
    setupAddBlogForm() {
        const form = document.getElementById('add-blog-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNewPost();
            });
        }
    }

    // Setup edit modal
    setupEditModal() {
        const updateBtn = document.getElementById('update-blog-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.updatePost();
            });
        }

        // Setup image preview for edit modal
        const imageInput = document.getElementById('edit-blog-image');
        if (imageInput) {
            imageInput.addEventListener('input', () => {
                this.updateImagePreview();
            });
        }
    }

    // Open edit modal with post data
    openEditModal(postId) {
        const post = this.blogPosts.find(p => p.id === postId);
        if (!post) {
            this.showAlert('Post not found!', 'danger');
            return;
        }

        this.currentEditId = postId;

        // Fill form with post data
        document.getElementById('edit-blog-id').value = post.id;
        document.getElementById('edit-blog-title').value = post.title;
        document.getElementById('edit-blog-excerpt').value = post.excerpt;
        document.getElementById('edit-blog-content').value = post.content;
        document.getElementById('edit-blog-image').value = post.image;
        document.getElementById('edit-blog-author').value = post.author;
        document.getElementById('edit-blog-category').value = post.category;
        document.getElementById('edit-blog-tags').value = post.tags ? post.tags.join(', ') : '';
        document.getElementById('edit-blog-read-time').value = post.readTime || 5;
        document.getElementById('edit-blog-status').value = post.status || 'published';

        // Update image preview
        this.updateImagePreview();

        // Show modal
        const editModal = new bootstrap.Modal(document.getElementById('editBlogModal'));
        editModal.show();
    }

    // Update image preview in edit modal
    updateImagePreview() {
        const imageUrl = document.getElementById('edit-blog-image').value;
        const preview = document.getElementById('edit-image-preview');
        
        if (imageUrl && this.isValidUrl(imageUrl)) {
            preview.src = imageUrl;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }

    // Validate URL
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Update post
    updatePost() {
        const title = document.getElementById('edit-blog-title').value;
        const excerpt = document.getElementById('edit-blog-excerpt').value;
        const content = document.getElementById('edit-blog-content').value;
        const image = document.getElementById('edit-blog-image').value;
        const author = document.getElementById('edit-blog-author').value;
        const category = document.getElementById('edit-blog-category').value;
        const tags = document.getElementById('edit-blog-tags').value;
        const readTime = document.getElementById('edit-blog-read-time').value;
        const status = document.getElementById('edit-blog-status').value;

        // Validate required fields
        if (!title || !excerpt || !content || !image || !category || !author) {
            this.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        // Get existing posts
        const existingPosts = this.getBlogPosts();
        const postIndex = existingPosts.findIndex(p => p.id === this.currentEditId);
        
        if (postIndex === -1) {
            this.showAlert('Post not found!', 'danger');
            return;
        }

        // Update post
        existingPosts[postIndex] = {
            ...existingPosts[postIndex],
            title: title,
            excerpt: excerpt,
            content: content,
            image: image,
            author: author,
            category: category,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            readTime: parseInt(readTime) || 5,
            status: status
        };

        // Save to localStorage
        localStorage.setItem('blogPosts', JSON.stringify(existingPosts));
        
        // Hide modal
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editBlogModal'));
        editModal.hide();
        
        // Refresh display
        this.blogPosts = existingPosts;
        this.loadBlogPosts();
        this.updateBlogStats();
        
        this.showAlert('Blog post updated successfully!', 'success');
    }

    // Add new blog post
    addNewPost() {
        const title = document.getElementById('blog-title').value;
        const excerpt = document.getElementById('blog-excerpt').value;
        const content = document.getElementById('blog-content').value;
        const image = document.getElementById('blog-image').value;
        const author = document.getElementById('blog-author').value;
        const category = document.getElementById('blog-category').value;
        const tags = document.getElementById('blog-tags').value;
        const readTime = document.getElementById('blog-read-time').value;
        const status = document.getElementById('blog-status').value;

        // Validate required fields
        if (!title || !excerpt || !content || !image || !category) {
            this.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        const newPost = {
            id: Date.now(),
            title: title,
            excerpt: excerpt,
            content: content,
            image: image,
            author: author,
            date: new Date().toISOString().split('T')[0],
            category: category,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            readTime: parseInt(readTime) || 5,
            status: status,
            comments: 0,
            views: 0,
            authorBio: "Farm expert and agricultural enthusiast with over 10 years of experience in sustainable farming practices."
        };

        // Get existing posts and add new one
        const existingPosts = this.getBlogPosts();
        existingPosts.unshift(newPost);
        localStorage.setItem('blogPosts', JSON.stringify(existingPosts));
        
        // Show success message
        this.showAlert('Blog post added successfully!', 'success');
        
        // Redirect to blog management page after 2 seconds
        setTimeout(() => {
            window.location.href = 'blog.html';
        }, 2000);
    }

    // Delete blog post
    deletePost(postId) {
        const post = this.blogPosts.find(p => p.id === postId);
        if (post && confirm(`Are you sure you want to delete "${post.title}"? This action cannot be undone.`)) {
            const existingPosts = this.getBlogPosts();
            const updatedPosts = existingPosts.filter(p => p.id !== postId);
            localStorage.setItem('blogPosts', JSON.stringify(updatedPosts));
            
            // Refresh the display
            this.blogPosts = updatedPosts;
            this.loadBlogPosts();
            this.updateBlogStats();
            this.showAlert('Blog post deleted successfully!', 'success');
        }
    }

    // Show alert message
    showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to page
        const header = document.querySelector('.admin-header');
        if (header) {
            header.parentNode.insertBefore(alert, header.nextSibling);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Initialize admin blog manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminBlog = new AdminBlogManager();
});

// Debug function to check localStorage
function debugBlogPosts() {
    console.log('Blog Posts in localStorage:', JSON.parse(localStorage.getItem('blogPosts')));
}