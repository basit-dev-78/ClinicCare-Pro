/**
 * ClinicCare Pro - Shared API Utility
 * Handles authenticated fetch requests to the backend API.
 */

const API_BASE = 'http://localhost:5000/api';

const API = {
    /**
     * Get headers for authenticated requests
     */
    getHeaders: () => {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    /**
     * Handle API responses
     */
    handleResponse: async (response) => {
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text || '{}');
        } catch (e) {
            data = { message: text };
        }

        if (!response.ok) {
            // Handle session expiration
            if (response.status === 401 || response.status === 403) {
                if (!window.location.pathname.includes('auth.html')) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    window.location.href = 'auth.html';
                }
            }
            throw new Error(data.message || data.error || 'Server request failed');
        }
        return data;
    },

    /**
     * GET request
     */
    get: async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'GET',
                headers: API.getHeaders()
            });
            return await API.handleResponse(response);
        } catch (error) {
            console.error(`API GET Error [${endpoint}]:`, error);
            throw error;
        }
    },

    /**
     * POST request
     */
    post: async (endpoint, payload) => {
        try {
            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'POST',
                headers: API.getHeaders(),
                body: JSON.stringify(payload)
            });
            return await API.handleResponse(response);
        } catch (error) {
            console.error(`API POST Error [${endpoint}]:`, error);
            throw error;
        }
    },

    /**
     * PUT request
     */
    put: async (endpoint, payload) => {
        try {
            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'PUT',
                headers: API.getHeaders(),
                body: JSON.stringify(payload)
            });
            return await API.handleResponse(response);
        } catch (error) {
            console.error(`API PUT Error [${endpoint}]:`, error);
            throw error;
        }
    },

    /**
     * DELETE request
     */
    delete: async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'DELETE',
                headers: API.getHeaders()
            });
            return await API.handleResponse(response);
        } catch (error) {
            console.error(`API DELETE Error [${endpoint}]:`, error);
            throw error;
        }
    }
};

// Export for use in global scope
window.API = API;
