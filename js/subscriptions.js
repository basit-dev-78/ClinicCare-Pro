// ==================== SUBSCRIPTION FUNCTIONS ====================

// Change billing period
window.changeBillingPeriod = function(period) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const basicPrice = document.getElementById('basicPrice');
    const proPrice = document.getElementById('professionalPrice');
    const enterprisePrice = document.getElementById('enterprisePrice');

    if (period === 'yearly') {
        basicPrice.textContent = '950';
        proPrice.textContent = '1910';
        enterprisePrice.textContent = '3830';
        document.querySelectorAll('.period').forEach(el => el.textContent = '/year');
    } else {
        basicPrice.textContent = '99';
        proPrice.textContent = '199';
        enterprisePrice.textContent = '399';
        document.querySelectorAll('.period').forEach(el => el.textContent = '/month');
    }
};

// Select plan
window.selectPlan = function(plan) {
    document.querySelectorAll('.plan-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    let planName = plan.charAt(0).toUpperCase() + plan.slice(1);
    document.getElementById('currentPlan').textContent = planName + ' Plan';
    
    window.addNotification(`Switched to ${plan} plan`, 'info');
};

// Load billing history
window.loadBillingHistory = function() {
    const tbody = document.getElementById('billingHistoryBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const history = [
        { date: '2024-01-01', invoice: 'INV-001', plan: 'Professional', amount: 199, status: 'Paid' },
        { date: '2023-12-01', invoice: 'INV-002', plan: 'Professional', amount: 199, status: 'Paid' },
        { date: '2023-11-01', invoice: 'INV-003', plan: 'Professional', amount: 199, status: 'Paid' }
    ];

    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.invoice}</td>
            <td>${item.plan}</td>
            <td>$${item.amount}</td>
            <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
            <td><button class="btn-icon" onclick="downloadInvoice('${item.invoice}')"><i class="fas fa-download"></i></button></td>
        `;
        tbody.appendChild(row);
    });
};

// Download invoice
window.downloadInvoice = function(invoiceId) {
    window.addNotification(`Downloading invoice ${invoiceId}`, 'info');
    // Implement actual download logic here
};