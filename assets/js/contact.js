// Contact Form Handling - Standalone version
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');

            // Validate form
            if (!name || !email || !subject || !message) {
                showFormMessage('Please fill in all required fields.', 'error');
                return;
            }

            if (!isValidEmail(email)) {
                showFormMessage('Please enter a valid email address.', 'error');
                return;
            }

            // Create message object
            const messageData = {
                id: Date.now(),
                name: name.trim(),
                email: email.trim(),
                subject: subject.trim(),
                message: message.trim(),
                date: new Date().toISOString(),
                read: false
            };

            // Save message to localStorage
            saveMessageToStorage(messageData);

            // Show success message
            showFormMessage('Your message has been sent successfully! We will get back to you soon.', 'success');

            // Reset form
            this.reset();
        });
    }

    function saveMessageToStorage(messageData) {
        try {
            const messages = JSON.parse(localStorage.getItem('contactMessages')) || [];
            messages.push(messageData);
            localStorage.setItem('contactMessages', JSON.stringify(messages));
            return true;
        } catch (error) {
            console.error('Error saving message:', error);
            return false;
        }
    }

    function showFormMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.form-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message alert alert-${type === 'success' ? 'success' : 'danger'} mt-3`;
        messageDiv.textContent = message;

        const form = document.getElementById('contact-form');
        form.appendChild(messageDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
});