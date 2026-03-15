// ==================== MAIN APPLICATION FUNCTIONS ====================

// Update current date
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

// Show section
window.showSection = function(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === '#' + sectionId) {
            item.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'doctors': 'Doctors Management',
        'receptionists': 'Receptionists Management',
        'analytics': 'Analytics',
        'subscriptions': 'Subscriptions',
        'system': 'System Usage'
    };
    
    const titleElement = document.getElementById('currentPageTitle');
    if (titleElement) {
        titleElement.textContent = titles[sectionId] || 'Dashboard';
    }
    
    // Load section-specific data
    if (sectionId === 'analytics' && typeof window.loadAnalytics === 'function') {
        window.loadAnalytics();
    } else if (sectionId === 'subscriptions' && typeof window.loadBillingHistory === 'function') {
        window.loadBillingHistory();
    } else if (sectionId === 'doctors' && typeof window.loadDoctors === 'function') {
        window.loadDoctors();
    } else if (sectionId === 'receptionists' && typeof window.loadReceptionists === 'function') {
        window.loadReceptionists();
    }
};

// Toggle sidebar on mobile
window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('active');
};

// Modal functions
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
};

// Toggle notifications
window.toggleNotifications = function() {
    document.getElementById('notificationPanel').classList.toggle('active');
};

// Notification functions
window.addNotification = function(message, type = 'info') {
    const notification = {
        id: Date.now(),
        message: message,
        type: type,
        time: new Date().toLocaleTimeString(),
        read: false
    };
    
    window.notifications.unshift(notification);
    updateNotificationBadge();
    displayNotifications();
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const index = window.notifications.findIndex(n => n.id === notification.id);
        if (index > -1) {
            window.notifications.splice(index, 1);
            updateNotificationBadge();
            displayNotifications();
        }
    }, 5000);
};

// Update notification badge
function updateNotificationBadge() {
    const unreadCount = window.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount;
    }
}

// Display notifications
function displayNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    list.innerHTML = '';

    window.notifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item ${!notification.read ? 'unread' : ''}`;
        
        let icon = 'info-circle';
        let color = '#2563eb';
        
        if (notification.type === 'success') {
            icon = 'check-circle';
            color = '#10b981';
        } else if (notification.type === 'warning') {
            icon = 'exclamation-circle';
            color = '#f59e0b';
        } else if (notification.type === 'error') {
            icon = 'times-circle';
            color = '#ef4444';
        }
        
        item.innerHTML = `
            <i class="fas fa-${icon}" style="color: ${color}"></i>
            <div>
                <p>${notification.message}</p>
                <small>${notification.time}</small>
            </div>
        `;
        list.appendChild(item);
    });
}

// Mark all notifications as read
window.markAllRead = function() {
    window.notifications.forEach(n => n.read = true);
    updateNotificationBadge();
    displayNotifications();
};

// Handle global search
window.handleSearch = function() {
    const searchTerm = document.getElementById('globalSearch').value.toLowerCase();
    const activeSection = document.querySelector('.section.active')?.id;
    
    if (activeSection === 'doctors' && typeof window.searchDoctors === 'function') {
        window.searchDoctors();
    } else if (activeSection === 'receptionists' && typeof window.searchReceptionists === 'function') {
        window.searchReceptionists();
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    
    // Check for existing session
    if (typeof window.checkSession === 'function') {
        window.checkSession();
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
        if (!e.target.closest('.notification-panel') && !e.target.closest('.notification-btn')) {
            document.getElementById('notificationPanel')?.classList.remove('active');
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.querySelector('.menu-toggle');
        
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            document.getElementById('sidebar')?.classList.remove('active');
        }
    });
});