// ==================== ANALYTICS FUNCTIONS ====================

// Load analytics data
window.loadAnalytics = async function() {
    try {
        // Generate random data for demo (replace with real data from your database)
        const appointments = Math.floor(Math.random() * 500) + 200;
        const revenue = Math.floor(Math.random() * 100000) + 50000;
        const newPatients = Math.floor(Math.random() * 100) + 50;
        const satisfaction = (Math.random() * 1 + 4).toFixed(1);

        document.getElementById('totalAppointments').textContent = appointments;
        document.getElementById('totalRevenue').textContent = '$' + revenue.toLocaleString();
        document.getElementById('newPatients').textContent = newPatients;
        document.getElementById('satisfactionRate').textContent = satisfaction;

        document.getElementById('appointmentChange').textContent = '+' + (Math.random() * 20).toFixed(1) + '%';
        document.getElementById('revenueChange').textContent = '+' + (Math.random() * 25).toFixed(1) + '%';
        document.getElementById('patientChange').textContent = '+' + (Math.random() * 15).toFixed(1) + '%';
        document.getElementById('satisfactionChange').textContent = '+' + (Math.random() * 0.5).toFixed(1);

        // Initialize charts
        initAnalyticsCharts();

        // Load top doctors and departments
        loadTopDoctors();
        loadPopularDepartments();

    } catch (error) {
        console.error('Error loading analytics:', error);
    }
};

// Initialize analytics charts
function initAnalyticsCharts() {
    // Visits chart
    const visitsCtx = document.getElementById('visitsChart')?.getContext('2d');
    if (visitsCtx) {
        if (window.charts.visits) window.charts.visits.destroy();
        window.charts.visits = new Chart(visitsCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Patient Visits',
                    data: Array.from({length: 4}, () => Math.floor(Math.random() * 200) + 100),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Revenue chart
    const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
    if (revenueCtx) {
        if (window.charts.revenue) window.charts.revenue.destroy();
        window.charts.revenue = new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: Array.from({length: 4}, () => Math.floor(Math.random() * 20000) + 10000),
                    backgroundColor: '#10b981',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Department chart
    const deptCtx = document.getElementById('departmentChart')?.getContext('2d');
    if (deptCtx) {
        if (window.charts.department) window.charts.department.destroy();
        window.charts.department = new Chart(deptCtx, {
            type: 'doughnut',
            data: {
                labels: ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology'],
                datasets: [{
                    data: [30, 20, 25, 15, 10],
                    backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Peak hours chart
    const peakCtx = document.getElementById('peakHoursChart')?.getContext('2d');
    if (peakCtx) {
        if (window.charts.peak) window.charts.peak.destroy();
        window.charts.peak = new Chart(peakCtx, {
            type: 'line',
            data: {
                labels: ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'],
                datasets: [{
                    label: 'Patient Load',
                    data: [15, 35, 45, 40, 30, 25, 10],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Load top doctors
function loadTopDoctors() {
    const tbody = document.getElementById('topDoctorsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const doctors = [
        { name: 'Dr. John Smith', patients: 145, revenue: 15200 },
        { name: 'Dr. Sarah Johnson', patients: 132, revenue: 14800 },
        { name: 'Dr. Michael Brown', patients: 128, revenue: 13500 },
        { name: 'Dr. Emily Davis', patients: 118, revenue: 12200 },
        { name: 'Dr. David Wilson', patients: 105, revenue: 11000 }
    ];

    doctors.forEach(doctor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doctor.name}</td>
            <td>${doctor.patients}</td>
            <td>$${doctor.revenue.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Load popular departments
function loadPopularDepartments() {
    const tbody = document.getElementById('popularDepartmentsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const departments = [
        { name: 'Cardiology', appointments: 324, growth: '+12%' },
        { name: 'Pediatrics', appointments: 287, growth: '+8%' },
        { name: 'Neurology', appointments: 245, growth: '+15%' },
        { name: 'Orthopedics', appointments: 198, growth: '+5%' },
        { name: 'Dermatology', appointments: 156, growth: '+10%' }
    ];

    departments.forEach(dept => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dept.name}</td>
            <td>${dept.appointments}</td>
            <td><span class="kpi-change positive">${dept.growth}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Date range functions
window.changeDateRange = function(range) {
    document.querySelectorAll('.range-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadAnalytics();
};

window.applyCustomDate = function() {
    loadAnalytics();
};