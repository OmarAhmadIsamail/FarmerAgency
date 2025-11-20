class MessageManager {
    constructor() {
        this.messages = JSON.parse(localStorage.getItem('contactMessages')) || [];
        this.currentMessageId = null;
        this.init();
    }

    init() {
        this.loadMessages();
        this.updateStats();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('message-detail-modal');
            if (e.target === modal) {
                this.closeMessageModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMessageModal();
            }
        });
    }

    loadMessages(filter = 'all') {
        const tbody = document.getElementById('messages-table');
        if (!tbody) return;

        let filteredMessages = this.messages;

        if (filter === 'unread') {
            filteredMessages = this.messages.filter(msg => !msg.read);
        } else if (filter === 'read') {
            filteredMessages = this.messages.filter(msg => msg.read);
        }

        // Sort by date (newest first)
        filteredMessages.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredMessages.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="bi bi-inbox display-4 text-muted d-block mb-2"></i>
                        <p class="text-muted">No messages found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredMessages.map(message => `
            <tr class="${!message.read ? 'table-active' : ''}">
                <td>
                    <span class="badge ${message.read ? 'bg-success' : 'bg-warning'}">
                        ${message.read ? 'Read' : 'Unread'}
                    </span>
                </td>
                <td>${this.escapeHtml(message.name)}</td>
                <td>${this.escapeHtml(message.email)}</td>
                <td>${this.escapeHtml(message.subject)}</td>
                <td class="text-truncate" style="max-width: 200px;">
                    ${this.escapeHtml(message.message.substring(0, 50))}...
                </td>
                <td>${this.formatDate(message.date)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="messageManager.viewMessage(${message.id})" title="View Message">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="messageManager.confirmDelete(${message.id})" title="Delete Message">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    viewMessage(id) {
        const message = this.messages.find(msg => msg.id === id);
        if (!message) return;

        // Mark as read
        if (!message.read) {
            message.read = true;
            message.readDate = new Date().toISOString();
            this.saveMessages();
            this.loadMessages(); // Reload to update the table
            this.updateStats();
            this.updateMessageBadge();
        }

        this.currentMessageId = id;
        
        // Populate modal
        document.getElementById('detail-name').textContent = message.name;
        document.getElementById('detail-email').textContent = message.email;
        document.getElementById('detail-email').href = `mailto:${message.email}`;
        document.getElementById('detail-subject').textContent = message.subject;
        document.getElementById('detail-message').textContent = message.message;
        document.getElementById('detail-date').textContent = this.formatDate(message.date, true);
        
        const statusElement = document.getElementById('detail-status');
        statusElement.innerHTML = `
            <span class="badge ${message.read ? 'bg-success' : 'bg-warning'}">
                ${message.read ? 'Read' : 'Unread'}
            </span>
        `;

        // Show modal
        document.getElementById('message-detail-modal').style.display = 'block';
    }

    closeMessageModal() {
        document.getElementById('message-detail-modal').style.display = 'none';
        this.currentMessageId = null;
    }

    confirmDelete(id = null) {
        const messageId = id || this.currentMessageId;
        if (!messageId) return;

        const message = this.messages.find(msg => msg.id === messageId);
        if (!message) return;

        if (confirm(`Are you sure you want to delete the message from ${message.name}?`)) {
            this.deleteMessage(messageId);
        }
    }

    deleteMessage(id) {
        this.messages = this.messages.filter(msg => msg.id !== id);
        this.saveMessages();
        this.loadMessages();
        this.updateStats();
        this.updateMessageBadge();
        
        if (id === this.currentMessageId) {
            this.closeMessageModal();
        }
        
        this.showNotification('Message deleted successfully', 'success');
    }

    replyToMessage() {
        const message = this.messages.find(msg => msg.id === this.currentMessageId);
        if (!message) return;

        const email = message.email;
        const subject = `Re: ${message.subject}`;
        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
    }

    filterMessages(type) {
        this.loadMessages(type);
        
        // Update active filter button
        document.querySelectorAll('.btn-group .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    markAllAsRead() {
        if (this.messages.length === 0) return;
        
        if (confirm('Mark all messages as read?')) {
            this.messages.forEach(message => {
                message.read = true;
                message.readDate = new Date().toISOString();
            });
            this.saveMessages();
            this.loadMessages();
            this.updateStats();
            this.updateMessageBadge();
            this.showNotification('All messages marked as read', 'success');
        }
    }

    updateStats() {
        const total = this.messages.length;
        const read = this.messages.filter(msg => msg.read).length;
        const unread = total - read;
        
        const today = new Date().toDateString();
        const todayMessages = this.messages.filter(msg => 
            new Date(msg.date).toDateString() === today
        ).length;

        // Update stats cards
        const totalElement = document.getElementById('total-messages');
        const readElement = document.getElementById('read-messages');
        const unreadElement = document.getElementById('unread-messages');
        const todayElement = document.getElementById('today-messages');

        if (totalElement) totalElement.textContent = total;
        if (readElement) readElement.textContent = read;
        if (unreadElement) unreadElement.textContent = unread;
        if (todayElement) todayElement.textContent = todayMessages;
    }

    updateMessageBadge() {
        const unreadCount = this.messages.filter(msg => !msg.read).length;
        const messageLinks = document.querySelectorAll('a[href*="messages.html"]');
        
        messageLinks.forEach(link => {
            // Remove existing badge
            const existingBadge = link.querySelector('.message-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add new badge if there are unread messages
            if (unreadCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'message-badge badge bg-danger ms-2';
                badge.textContent = unreadCount;
                link.appendChild(badge);
            }
        });
    }

    // Method to be called from dashboard
    loadDashboardMessageStats() {
        const messages = JSON.parse(localStorage.getItem('contactMessages')) || [];
        const total = messages.length;
        const unread = messages.filter(msg => !msg.read).length;

        // Update dashboard stats
        const totalElement = document.getElementById('total-messages');
        if (totalElement) {
            totalElement.textContent = total;
        }

        // Update message badge in sidebar
        this.updateMessageBadge();

        return { total, unread };
    }

    // Export messages to CSV
    exportMessages() {
        if (this.messages.length === 0) {
            this.showNotification('No messages to export', 'warning');
            return;
        }

        const headers = ['Name', 'Email', 'Subject', 'Message', 'Date', 'Status'];
        const csvData = this.messages.map(msg => [
            `"${msg.name}"`,
            `"${msg.email}"`,
            `"${msg.subject}"`,
            `"${msg.message.replace(/"/g, '""')}"`,
            `"${this.formatDate(msg.date, true)}"`,
            `"${msg.read ? 'Read' : 'Unread'}"`
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `messages-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showNotification('Messages exported successfully', 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.message-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `message-notification alert alert-${type} alert-dismissible fade show`;
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

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    saveMessages() {
        localStorage.setItem('contactMessages', JSON.stringify(this.messages));
    }

    formatDate(dateString, full = false) {
        const date = new Date(dateString);
        if (full) {
            return date.toLocaleString();
        }
        return date.toLocaleDateString();
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize message manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.messageManager = new MessageManager();
    
    // If we're on the dashboard, load message stats
    if (document.getElementById('total-messages') && window.messageManager) {
        window.messageManager.loadDashboardMessageStats();
    }
});

// Export functions for global access
window.MessageManager = MessageManager;