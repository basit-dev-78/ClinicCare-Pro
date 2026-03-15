// ==================== DASHBOARD FUNCTIONS ====================

// Load dashboard data
window.loadDashboardData = async function() {
    try {
        // Get doctors count
        const { count: doctorsCount } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true });

        // Get receptionists count
        const { count: receptionistsCount } = await supabase
            .from('receptionists')
            .select('*', { count: 'exact', head: true });

        // Update stats
        document.getElementById('totalDoctors').textContent = doctorsCount || 0;
        document.getElementById('totalReceptionists').textContent = receptionistsCount || 0;
        
        // Simulated data (replace with real data from your database)
        document.getElementById('todayAppointments').textContent = Math.floor(Math.random() * 50) + 20;
        document.getElementById('todayAppointmentsStat').textContent = document.getElementById('todayAppointments').textContent;
        document.getElementById('totalPatients').textContent = Math.floor(Math.random() * 1000) + 500;
        document.getElementById('monthlyRevenue').textContent = '$' + (Math.floor(Math.random() * 50000) + 20000).toLocaleString();
        document.getElementById('systemUptime').textContent = '99.9%';
        document.getElementById('pendingTasks').textContent = Math.floor(Math.random() * 10) + 1;

        // Load recent activity
        loadRecentActivity();

        // Initialize dashboard charts
        initDashboardCharts();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
};

// Load recent activity
function loadRecentActivity() {
    const activities = [
        { icon: 'user-md', text: 'New doctor joined', time: '5 min ago' },
        { icon: 'calendar-check', text: 'Appointment completed', time: '15 min ago' },
        { icon: 'user-plus', text: 'New patient registered', time: '30 min ago' },
        { icon: 'credit-card', text: 'Subscription renewed', time: '1 hour ago' }
    ];

    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    activityList.innerHTML = '';

    activities.forEach(activity => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-${activity.icon}"></i>
            </div>
            <div class="activity-details">
                <h4>${activity.text}</h4>
                <p>${activity.time}</p>
            </div>
        `;
        activityList.appendChild(div);
    });
}

// Initialize dashboard charts
function initDashboardCharts() {
    // Visits chart
    const visitsCtx = document.getElementById('dashboardVisitsChart')?.getContext('2d');
    if (visitsCtx) {
        if (window.charts.dashboardVisits) window.charts.dashboardVisits.destroy();
        window.charts.dashboardVisits = new Chart(visitsCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Patient Visits',
                    data: Array.from({length: 7}, () => Math.floor(Math.random() * 50) + 20),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
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

    // Revenue chart
    const revenueCtx = document.getElementById('dashboardRevenueChart')?.getContext('2d');
    if (revenueCtx) {
        if (window.charts.dashboardRevenue) window.charts.dashboardRevenue.destroy();
        window.charts.dashboardRevenue = new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: Array.from({length: 7}, () => Math.floor(Math.random() * 5000) + 2000),
                    backgroundColor: '#10b981',
                    borderRadius: 5
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