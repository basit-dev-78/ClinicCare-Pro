// ==================== DOCTOR FUNCTIONS ====================

// Load doctors
window.loadDoctors = async function() {
    try {
        const { data, error } = await supabase
            .from('doctors')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        window.doctors = data || [];
        displayDoctors(window.doctors);
        updateDoctorStats();
        
    } catch (error) {
        console.error('Error loading doctors:', error);
        window.addNotification('Error loading doctors', 'error');
    }
};

// Display doctors in table
function displayDoctors(doctorsToShow) {
    const tbody = document.getElementById('doctorsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (doctorsToShow.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" style="text-align: center;">No doctors found</td>';
        tbody.appendChild(row);
        return;
    }

    doctorsToShow.forEach(doctor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doctor.name || 'N/A'}</td>
            <td>${doctor.department || 'N/A'}</td>
            <td>${doctor.specialization || 'N/A'}</td>
            <td>${doctor.email || 'N/A'}<br><small>${doctor.phone || ''}</small></td>
            <td>${doctor.experience || 0} years</td>
            <td><span class="status ${doctor.status || 'active'}">${doctor.status || 'active'}</span></td>
            <td>
                <button class="btn-icon" onclick="editDoctor('${doctor.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="deleteDoctor('${doctor.id}')"><i class="fas fa-trash"></i></button>
                <button class="btn-icon" onclick="viewDoctor('${doctor.id}')"><i class="fas fa-eye"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Add doctor
window.addDoctor = async function(event) {
    event.preventDefault();
    
    const doctorData = {
        name: document.getElementById('doctorName').value,
        email: document.getElementById('doctorEmail').value,
        phone: document.getElementById('doctorPhone').value,
        department: document.getElementById('doctorDepartment').value,
        specialization: document.getElementById('doctorSpecialization').value,
        experience: parseInt(document.getElementById('doctorExperience').value) || 0,
        status: 'active',
        clinic_id: window.currentUser?.id,
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('doctors')
            .insert([doctorData])
            .select();

        if (error) throw error;

        closeModal('addDoctorModal');
        await window.loadDoctors();
        window.addNotification('Doctor added successfully!', 'success');

    } catch (error) {
        alert('Error adding doctor: ' + error.message);
    }
};

// Edit doctor
window.editDoctor = async function(id) {
    const doctor = window.doctors.find(d => d.id === id);
    if (doctor) {
        // Populate form with doctor data
        document.getElementById('doctorName').value = doctor.name || '';
        document.getElementById('doctorEmail').value = doctor.email || '';
        document.getElementById('doctorPhone').value = doctor.phone || '';
        document.getElementById('doctorDepartment').value = doctor.department || '';
        document.getElementById('doctorSpecialization').value = doctor.specialization || '';
        document.getElementById('doctorExperience').value = doctor.experience || 0;
        
        // Change form submit handler for update
        const form = document.getElementById('addDoctorForm');
        form.onsubmit = async function(e) {
            e.preventDefault();
            await updateDoctor(id);
        };
        
        openModal('addDoctorModal');
    }
};

// Update doctor
async function updateDoctor(id) {
    const doctorData = {
        name: document.getElementById('doctorName').value,
        email: document.getElementById('doctorEmail').value,
        phone: document.getElementById('doctorPhone').value,
        department: document.getElementById('doctorDepartment').value,
        specialization: document.getElementById('doctorSpecialization').value,
        experience: parseInt(document.getElementById('doctorExperience').value) || 0
    };

    try {
        const { error } = await supabase
            .from('doctors')
            .update(doctorData)
            .eq('id', id);

        if (error) throw error;

        closeModal('addDoctorModal');
        await window.loadDoctors();
        window.addNotification('Doctor updated successfully!', 'success');
        
        // Reset form handler
        document.getElementById('addDoctorForm').onsubmit = window.addDoctor;

    } catch (error) {
        alert('Error updating doctor: ' + error.message);
    }
}

// Delete doctor
window.deleteDoctor = async function(id) {
    if (confirm('Are you sure you want to delete this doctor?')) {
        try {
            const { error } = await supabase
                .from('doctors')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await window.loadDoctors();
            window.addNotification('Doctor deleted successfully!', 'success');

        } catch (error) {
            alert('Error deleting doctor: ' + error.message);
        }
    }
};

// View doctor
window.viewDoctor = function(id) {
    const doctor = window.doctors.find(d => d.id === id);
    if (doctor) {
        alert(`Doctor Details:
Name: ${doctor.name}
Email: ${doctor.email}
Phone: ${doctor.phone}
Department: ${doctor.department}
Specialization: ${doctor.specialization}
Experience: ${doctor.experience} years
Status: ${doctor.status}`);
    }
};

// Search doctors
window.searchDoctors = function() {
    const searchTerm = document.getElementById('doctorSearch').value.toLowerCase();
    const filtered = window.doctors.filter(doctor => 
        (doctor.name && doctor.name.toLowerCase().includes(searchTerm)) ||
        (doctor.department && doctor.department.toLowerCase().includes(searchTerm)) ||
        (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm))
    );
    displayDoctors(filtered);
};

// Filter doctors
window.filterDoctors = function() {
    const department = document.getElementById('doctorDepartmentFilter').value;
    if (department) {
        const filtered = window.doctors.filter(doctor => doctor.department === department);
        displayDoctors(filtered);
    } else {
        displayDoctors(window.doctors);
    }
};

// Update doctor stats
function updateDoctorStats() {
    const totalDoctors = window.doctors.length;
    document.getElementById('totalDoctors').textContent = totalDoctors;
}