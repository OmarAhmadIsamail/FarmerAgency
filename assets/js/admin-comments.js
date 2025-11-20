// Admin Comment Management - UPDATED VERSION (No Pending Status)
class AdminCommentManager {
    constructor() {
        this.comments = this.getComments();
        this.blogPosts = this.getBlogPosts();
        this.selectedComments = new Set();
        this.init();
    }

    init() {
        if (window.location.pathname.includes('comments.html')) {
            this.loadComments();
            this.updateCommentStats();
            this.setupFilters();
            this.setupEventListeners();
        }
    }

    // Get all comments
    getComments() {
        const comments = JSON.parse(localStorage.getItem('blogComments')) || [];
        console.log('Loaded comments:', comments);
        return comments;
    }

    // Get blog posts
    getBlogPosts() {
        return JSON.parse(localStorage.getItem('blogPosts')) || [];
    }

    // Load comments for admin table
    loadComments() {
        const tableBody = document.getElementById('comments-table');
        if (!tableBody) {
            console.error('Comments table body not found');
            return;
        }

        const statusFilter = document.getElementById('status-filter').value;
        const postFilter = document.getElementById('post-filter').value;
        const searchTerm = document.getElementById('comment-search').value.toLowerCase();

        let filteredComments = this.comments;

        // Apply status filter
        if (statusFilter !== 'all') {
            filteredComments = filteredComments.filter(comment => comment.status === statusFilter);
        }

        // Apply post filter
        if (postFilter !== 'all') {
            filteredComments = filteredComments.filter(comment => comment.postId === parseInt(postFilter));
        }

        // Apply search filter
        if (searchTerm) {
            filteredComments = filteredComments.filter(comment => 
                comment.name.toLowerCase().includes(searchTerm) ||
                comment.email.toLowerCase().includes(searchTerm) ||
                comment.text.toLowerCase().includes(searchTerm)
            );
        }

        // Sort by date (newest first)
        filteredComments.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log('Filtered comments:', filteredComments);

        if (filteredComments.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="bi bi-chat-square-text display-4 text-muted d-block mb-2"></i>
                        <h5>No comments found</h5>
                        <p class="text-muted">No comments match your current filters.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredComments.map(comment => {
            const post = this.blogPosts.find(p => p.id === comment.postId);
            const postTitle = post ? post.title : 'Unknown Post';
            const commentDate = new Date(comment.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusBadge = this.getStatusBadge(comment.status);
            const isSelected = this.selectedComments.has(comment.id);

            return `
                <tr>
                    <td>
                        <input type="checkbox" class="comment-checkbox" value="${comment.id}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="comment-preview">
                            <p class="mb-1">${comment.text}</p>
                            ${comment.replies && comment.replies.length > 0 ? 
                                `<small class="text-muted"><i class="bi bi-reply"></i> ${comment.replies.length} admin replies</small>` : ''}
                        </div>
                    </td>
                    <td>
                        <div>
                            <strong>${comment.name}</strong>
                            <br>
                            <small class="text-muted">${comment.email}</small>
                        </div>
                    </td>
                    <td>
                        <a href="../blog-details.html?id=${comment.postId}" target="_blank" class="text-decoration-none">
                            ${postTitle.substring(0, 50)}${postTitle.length > 50 ? '...' : ''}
                        </a>
                    </td>
                    <td>${commentDate}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="adminCommentManager.viewComment(${comment.id})">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="adminCommentManager.markAsSpam(${comment.id})" ${comment.status === 'spam' ? 'disabled' : ''}>
                                <i class="bi bi-shield-exclamation"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="adminCommentManager.addReply(${comment.id})">
                                <i class="bi bi-reply"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="adminCommentManager.deleteComment(${comment.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Get status badge HTML - REMOVED PENDING STATUS
    getStatusBadge(status) {
        const statusConfig = {
            'approved': { class: 'bg-success', text: 'Approved' },
            'spam': { class: 'bg-danger', text: 'Spam' }
        };

        const config = statusConfig[status] || { class: 'bg-success', text: 'Approved' };
        return `<span class="badge ${config.class}">${config.text}</span>`;
    }

    // Update comment statistics - REMOVED PENDING COUNT
    updateCommentStats() {
        const totalComments = this.comments.length;
        const approvedComments = this.comments.filter(c => c.status === 'approved').length;
        const spamComments = this.comments.filter(c => c.status === 'spam').length;
        const totalReplies = this.comments.reduce((sum, comment) => sum + (comment.replies ? comment.replies.length : 0), 0);

        // Update DOM elements
        const totalCommentsEl = document.getElementById('total-comments');
        const approvedCommentsEl = document.getElementById('approved-comments');
        const spamCommentsEl = document.getElementById('pending-comments'); // Reusing pending element for spam
        const totalRepliesEl = document.getElementById('total-replies');

        if (totalCommentsEl) totalCommentsEl.textContent = totalComments;
        if (approvedCommentsEl) approvedCommentsEl.textContent = approvedComments;
        if (spamCommentsEl) spamCommentsEl.textContent = spamComments; // Show spam count instead of pending
        if (totalRepliesEl) totalRepliesEl.textContent = totalReplies;
    }

    // Setup filters
    setupFilters() {
        this.setupPostFilter();
        this.setupStatusFilter();
        this.setupSearchFilter();
    }

    // Setup post filter dropdown
    setupPostFilter() {
        const postFilter = document.getElementById('post-filter');
        if (!postFilter) return;

        // Clear existing options except the first one
        while (postFilter.children.length > 1) {
            postFilter.removeChild(postFilter.lastChild);
        }

        const uniquePosts = [...new Set(this.comments.map(comment => comment.postId))];
        
        uniquePosts.forEach(postId => {
            const post = this.blogPosts.find(p => p.id === postId);
            if (post) {
                const option = document.createElement('option');
                option.value = postId;
                option.textContent = post.title.length > 30 ? post.title.substring(0, 30) + '...' : post.title;
                postFilter.appendChild(option);
            }
        });
    }

    // Setup status filter - REMOVED PENDING OPTION
    setupStatusFilter() {
        const statusFilter = document.getElementById('status-filter');
        if (!statusFilter) return;

        statusFilter.innerHTML = `
            <option value="all">All Comments</option>
            <option value="approved">Approved</option>
            <option value="spam">Spam</option>
        `;
        
        statusFilter.addEventListener('change', () => {
            this.loadComments();
        });
    }

    // Setup search filter
    setupSearchFilter() {
        const searchInput = document.getElementById('comment-search');
        if (!searchInput) return;
        
        let searchTimeout;
        
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.loadComments();
            }, 300);
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.comment-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                    if (e.target.checked) {
                        this.selectedComments.add(parseInt(checkbox.value));
                    } else {
                        this.selectedComments.delete(parseInt(checkbox.value));
                    }
                });
            });
        }

        // Individual checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('comment-checkbox')) {
                const commentId = parseInt(e.target.value);
                if (e.target.checked) {
                    this.selectedComments.add(commentId);
                } else {
                    this.selectedComments.delete(commentId);
                    const selectAll = document.getElementById('select-all');
                    if (selectAll) selectAll.checked = false;
                }
            }
        });

        // Delete selected button
        const deleteSelectedBtn = document.getElementById('delete-selected');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelectedComments();
            });
        }
    }

    // View comment details
    viewComment(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            const post = this.blogPosts.find(p => p.id === comment.postId);
            const modalContent = `
                <div class="modal fade" id="commentModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Comment Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Author Information</h6>
                                        <p><strong>Name:</strong> ${comment.name}</p>
                                        <p><strong>Email:</strong> ${comment.email}</p>
                                        <p><strong>Date:</strong> ${new Date(comment.date).toLocaleString()}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Post Information</h6>
                                        <p><strong>Post:</strong> ${post ? post.title : 'Unknown'}</p>
                                        <p><strong>Status:</strong> ${this.getStatusBadge(comment.status)}</p>
                                    </div>
                                </div>
                                <hr>
                                <h6>Comment Content</h6>
                                <div class="card">
                                    <div class="card-body">
                                        <p class="mb-0">${comment.text}</p>
                                    </div>
                                </div>
                                
                                ${comment.replies && comment.replies.length > 0 ? `
                                    <hr>
                                    <h6>Admin Replies (${comment.replies.length})</h6>
                                    ${comment.replies.map(reply => `
                                        <div class="card mb-2 border-primary">
                                            <div class="card-body">
                                                <div class="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <p class="mb-1">${reply.text}</p>
                                                        <small class="text-muted">By ${reply.name} on ${new Date(reply.date).toLocaleString()}</small>
                                                    </div>
                                                    <span class="badge bg-primary">Admin</span>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                ` : ''}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" onclick="adminCommentManager.addReply(${comment.id})">
                                    <i class="bi bi-reply me-1"></i>Add Reply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal
            const existingModal = document.getElementById('commentModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add new modal
            document.body.insertAdjacentHTML('beforeend', modalContent);
            const modal = new bootstrap.Modal(document.getElementById('commentModal'));
            modal.show();
        }
    }

    // Add reply to comment
    addReply(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            const replyText = prompt('Enter your reply as admin:');
            if (replyText && replyText.trim()) {
                const newReply = {
                    id: Date.now(),
                    name: 'Admin',
                    text: replyText.trim(),
                    date: new Date().toISOString(),
                    isAdmin: true
                };

                if (!comment.replies) {
                    comment.replies = [];
                }

                comment.replies.push(newReply);
                this.saveComments();
                this.loadComments();
                this.updateCommentStats();
                this.showAlert('Reply added successfully!', 'success');
            }
        }
    }

    // REMOVED approveComment function since all comments are auto-approved

    // Mark comment as spam
    markAsSpam(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            comment.status = 'spam';
            this.saveComments();
            this.loadComments();
            this.updateCommentStats();
            this.showAlert('Comment marked as spam!', 'warning');
        }
    }

    // Delete single comment
    deleteComment(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment && confirm(`Are you sure you want to delete this comment by ${comment.name}?`)) {
            this.comments = this.comments.filter(c => c.id !== commentId);
            this.saveComments();
            this.loadComments();
            this.updateCommentStats();
            this.showAlert('Comment deleted successfully!', 'success');
        }
    }

    // Delete selected comments
    deleteSelectedComments() {
        if (this.selectedComments.size === 0) {
            alert('Please select comments to delete.');
            return;
        }

        if (confirm(`Are you sure you want to delete ${this.selectedComments.size} selected comments?`)) {
            this.comments = this.comments.filter(c => !this.selectedComments.has(c.id));
            this.saveComments();
            this.selectedComments.clear();
            this.loadComments();
            this.updateCommentStats();
            this.showAlert(`${this.selectedComments.size} comments deleted successfully!`, 'success');
        }
    }

    // Save comments to localStorage
    saveComments() {
        localStorage.setItem('blogComments', JSON.stringify(this.comments));
        // Refresh the comments data
        this.comments = this.getComments();
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

// Initialize admin comment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminCommentManager = new AdminCommentManager();
});