// ==================== SYSTEM MONITORING FUNCTIONS ====================

let monitoringInterval = null;

// Start system monitoring
window.startSystemMonitoring = function() {
    // Clear existing interval if any
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    // Update every 5 seconds
    monitoringInterval = setInterval(updateSystemMetrics, 5000);
    
    // Initialize user activity chart
    initUserActivityChart();
    
    // Add initial logs
    addSystemLog('System started', 'success');
    addSystemLog('Monitoring active', 'info');
};

// Stop system monitoring
window.stopSystemMonitoring = function() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
};

// Update system metrics
function updateSystemMetrics() {
    const cpu = Math.floor(Math.random() * 60) + 20;
    const memory = Math.floor(Math.random() * 50) + 30;
    const disk = Math.floor(Math.random() * 40) + 20;

    document.getElementById('cpuUsage').textContent = cpu + '%';
    document.getElementById('cpuProgress').style.width = cpu + '%';
    
    document.getElementById('memoryUsage').textContent = memory + '%';
    document.getElementById('memoryProgress').style.width = memory + '%';
    
    document.getElementById('diskUsage').textContent = disk + '%';
    document.getElementById('diskProgress').style.width = disk + '%';

    document.getElementById('uptime').textContent = Math.floor(Math.random() * 30) + 1 + ' days';
    document.getElementById('responseTime').textContent = Math.floor(Math.random() * 200) + 50 + 'ms';

    // Update active users
    document.getElementById('activeDoctors').textContent = Math.floor(Math.random() * 10) + 5;
    document.getElementById('activeReceptionists').textContent = Math.floor(Math.random() * 5) + 2;
    document.getElementById('activePatients').textContent = Math.floor(Math.random() * 30) + 10;

    // Add random log occasionally
    if (Math.random() > 0.7) {
        const logs = [
            { type: 'info', message: 'Database backup completed' },
            { type: 'warning', message: 'High CPU usage detected' },
            { type: 'success', message: 'New user registered' },
            { type: 'info', message: 'System update available' }
        ];
        const log = logs[Math.floor(Math.random() * logs.length)];
        addSystemLog(log.message, log.type);
    }

    // Update user activity chart
    updateUserActivityChart();
}

// Initialize user activity chart
function initUserActivityChart() {
    const ctx = document.getElementById('userActivityChart')?.getContext('2d');
    if (ctx) {
        if (window.charts.userActivity) window.charts.userActivity.destroy();
        window.charts.userActivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['12AM', '4AM', '8AM', '12PM', '4PM', '8PM'],
                datasets: [{
                    label: 'Active Users',
                    data: Array.from({length: 6}, () => Math.floor(Math.random() * 20) + 5),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139,92,246,0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// Update user activity chart
function updateUserActivityChart() {
    if (window.charts.userActivity) {
        window.charts.userActivity.data.datasets[0].data = Array.from({length: 6}, () => Math.floor(Math.random() * 20) + 5);
        window.charts.userActivity.update();
    }
}

// Add system log
function addSystemLog(message, type = 'info') {
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    const time = new Date().toLocaleTimeString();
    logEntry.innerHTML = `<span>[${time}] ${message}</span>`;
    
    logsContainer.insertBefore(logEntry, logsContainer.firstChild);
    
    // Keep only last 20 logs
    while (logsContainer.children.length > 20) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    window.stopSystemMonitoring();
});