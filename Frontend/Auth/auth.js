const API_BASE = 'http://localhost:5000/api';

function clearSession() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const icon = type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    toast.className = `toast-message ${type} show`;

    clearTimeout(window.authToastTimeout);
    window.authToastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

async function apiRequest(endpoint, payload) {
    try {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text || '{}');
        } catch (parseError) {
            result = { message: text };
        }

        if (!response.ok) {
            throw new Error(result.message || 'Server request failed');
        }

        return result;
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Unable to connect to the backend API. Start the backend server and refresh the page.');
        }
        throw error;
    }
}

async function apiGet(endpoint) {
    try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'GET',
            headers
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text || '{}');
        } catch (parseError) {
            result = { message: text };
        }

        if (!response.ok) {
            throw new Error(result.message || 'Server request failed');
        }

        return result;
    } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Unable to connect to the backend API. Start the backend server and refresh the page.');
        }
        throw error;
    }
}

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function saveSession(user, token) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        specialization: user.specialization || ''
    }));
}

function isBlockedAccountMessage(message) {
    const normalized = String(message || '').toLowerCase();
    return normalized.includes('blocked by admin') || normalized.includes('blocked from admin');
}

function redirectToDashboard(role) {
    let filename = `${role}-dashboard.html`;
    if (role === 'pharma') filename = 'medical-pharma.html';
    const destination = `../../${filename}`;
    window.location.href = destination;
}

async function checkAuthenticatedRedirect() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const token = localStorage.getItem('authToken');
    if (!currentUser || !token) {
        return;
    }

    try {
        const result = await apiGet('verify');
        redirectToDashboard(result.user?.role || currentUser.role || 'patient');
    } catch (error) {
        clearSession();
        if (isBlockedAccountMessage(error.message)) {
            showToast('Your account is blocked by admin. You cannot log in.', 'error');
        }
    }
}

window.toggleSpecializationField = function() {
    const role = document.getElementById('regRole')?.value;
    const specField = document.getElementById('specializationField');
    if (!specField) return;
    specField.style.display = role === 'doctor' ? 'block' : 'none';
};

window.handleLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail')?.value || '';
    const password = document.getElementById('loginPassword')?.value || '';
    const button = document.getElementById('loginBtn');

    if (!email || !password) {
        showToast('Please enter your email and password.', 'error');
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'Signing in...';
    }

    try {
        const result = await apiRequest('login', { email, password });
        saveSession(result.user, result.token);
        showToast(`Welcome back, ${result.user.name.split(' ')[0]}!`, 'success');
        setTimeout(() => redirectToDashboard(result.user.role), 900);
    } catch (error) {
        clearSession();
        if (isBlockedAccountMessage(error.message)) {
            showToast('This user is blocked by admin. Please contact the administrator.', 'error');
            return;
        }
        showToast(error.message, 'error');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Sign In';
        }
    }
};

window.handleSignup = async function(event) {
    event.preventDefault();
    const name = document.getElementById('regName')?.value || '';
    const email = document.getElementById('regEmail')?.value || '';
    const phone = document.getElementById('regPhone')?.value || '';
    const role = document.getElementById('regRole')?.value || '';
    const password = document.getElementById('regPassword')?.value || '';
    const confirm = document.getElementById('regConfirmPassword')?.value || '';
    const specialization = document.getElementById('regSpecialization')?.value || '';
    const button = document.getElementById('signupBtn');

    if (!name || !email || !phone || !role || !password || !confirm) {
        showToast('Please complete all required fields.', 'error');
        return;
    }

    if (password !== confirm) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'Creating account...';
    }

    try {
        const result = await apiRequest('signup', {
            name,
            email,
            phone,
            role,
            password,
            specialization: role === 'doctor' ? specialization : ''
        });

        saveSession(result.user, result.token);
        showToast('Account created successfully!', 'success');
        setTimeout(() => redirectToDashboard(role), 900);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Create account';
        }
    }
};

window.handleForgotPasswordRequest = async function(event) {
    event.preventDefault();
    const email = document.getElementById('resetEmail')?.value || '';
    const resetSection = document.getElementById('resetSection');
    const hiddenEmail = document.getElementById('resetEmailStored');

    if (!email) {
        showToast('Please enter your email address.', 'error');
        return;
    }

    try {
        await apiRequest('forgot-password', { email });
        if (hiddenEmail) hiddenEmail.value = email.trim().toLowerCase();
        if (resetSection) resetSection.classList.remove('hidden');
        showToast('Email found. Enter a new password below.', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.handleResetPassword = async function(event) {
    event.preventDefault();
    const hiddenEmail = document.getElementById('resetEmailStored')?.value || '';
    const newPassword = document.getElementById('newPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmNewPassword')?.value || '';

    if (!hiddenEmail) {
        showToast('Please request password reset first.', 'error');
        return;
    }

    if (!newPassword || !confirmPassword) {
        showToast('Please fill both password fields.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }

    try {
        await apiRequest('reset-password', {
            email: hiddenEmail,
            newPassword
        });
        showToast('Password updated. Please sign in with your new password.', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
    } catch (error) {
        showToast(error.message, 'error');
    }
};

window.addEventListener('DOMContentLoaded', async () => {
    const shouldAutoRedirect = document.body.dataset.autoRedirect === 'true';
    if (shouldAutoRedirect) {
        await checkAuthenticatedRedirect();
    }

    const roleParam = getQueryParam('role');
    if (roleParam) {
        const roleSelect = document.getElementById('regRole');
        if (roleSelect) {
            roleSelect.value = roleParam;
            toggleSpecializationField();
        }
    }
});
