// ==================== AUTHENTICATION FUNCTIONS ====================

// Toggle between login and signup forms
document.addEventListener('DOMContentLoaded', function() {
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    
    if (switchToSignup) {
        switchToSignup.addEventListener('click', function() {
            document.getElementById('loginForm').classList.remove('active');
            document.getElementById('signupForm').classList.add('active');
            document.getElementById('authTitle').textContent = 'Create Account';
            document.getElementById('authSubtitle').textContent = 'Get started with your clinic';
            this.style.display = 'none';
            document.getElementById('switchToLogin').style.display = 'inline-block';
            document.getElementById('switchText').textContent = 'Already have an account?';
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', function() {
            document.getElementById('signupForm').classList.remove('active');
            document.getElementById('loginForm').classList.add('active');
            document.getElementById('authTitle').textContent = 'Sign In';
            document.getElementById('authSubtitle').textContent = 'Access your clinic dashboard';
            this.style.display = 'none';
            document.getElementById('switchToSignup').style.display = 'inline-block';
            document.getElementById('switchText').textContent = "Don't have an account?";
        });
    }
});

// Toggle password visibility
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
};

// Login function
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    try {
        // Check if supabase is initialized
        if (!window.supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        window.currentUser = data.user;
        
        // Set session persistence based on remember me
        if (rememberMe) {
            await window.supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            });
        }
        
        // Get user profile
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', window.currentUser.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
        }

        // Update UI
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';
        
        document.getElementById('userName').textContent = profile?.full_name || email.split('@')[0];
        document.getElementById('userEmail').textContent = email;
        document.getElementById('welcomeName').textContent = profile?.full_name?.split(' ')[0] || email.split('@')[0];

        // Store user data
        localStorage.setItem('clinicUser', JSON.stringify({
            id: window.currentUser.id,
            email: email,
            name: profile?.full_name || email.split('@')[0]
        }));

        // Load initial data
        if (typeof window.loadDoctors === 'function') window.loadDoctors();
        if (typeof window.loadReceptionists === 'function') window.loadReceptionists();
        if (typeof window.loadDashboardData === 'function') window.loadDashboardData();
        if (typeof window.loadAnalytics === 'function') window.loadAnalytics();
        if (typeof window.startSystemMonitoring === 'function') window.startSystemMonitoring();
        
        if (typeof window.addNotification === 'function') {
            window.addNotification('Welcome back!', 'success');
        } else {
            alert('Welcome back!');
        }

    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
});

// Signup function - FIXED VERSION
document.getElementById('signupForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const clinic = document.getElementById('signupClinic').value;

    // Validate passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    // Validate password strength
    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
    }

    try {
        // Check if supabase is initialized
        if (!window.supabase) {
            throw new Error('Supabase client not initialized. Please check your configuration.');
        }

        console.log('Attempting signup with:', { email, name, clinic });

        // Sign up with Supabase
        const { data, error } = await window.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    clinic_name: clinic
                }
            }
        });

        if (error) {
            console.error('Supabase signup error:', error);
            throw error;
        }

        console.log('Signup response:', data);

        if (data.user) {
            // Create profile in profiles table
            const { error: profileError } = await window.supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        full_name: name,
                        clinic_name: clinic,
                        email: email,
                        role: 'admin',
                        created_at: new Date().toISOString()
                    }
                ]);

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Don't throw here - user is already created
            }

            alert('Account created successfully! Please check your email for verification link.');
            
            // Clear form
            document.getElementById('signupForm').reset();
            
            // Switch to login form
            document.getElementById('switchToLogin').click();
        } else {
            throw new Error('No user data returned from signup');
        }

    } catch (error) {
        console.error('Signup error details:', error);
        
        // Handle specific error messages
        let errorMessage = error.message;
        if (errorMessage.includes('User already registered')) {
            errorMessage = 'This email is already registered. Please try logging in.';
        } else if (errorMessage.includes('Password should be at least 6 characters')) {
            errorMessage = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Unable to validate email address')) {
            errorMessage = 'Invalid email address format.';
        }
        
        alert('Signup failed: ' + errorMessage);
    }
});

// Logout function
window.logout = async function() {
    try {
        if (!window.supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { error } = await window.supabase.auth.signOut();
        if (error) throw error;
        
        window.currentUser = null;
        
        // Clear stored data
        localStorage.removeItem('clinicUser');
        
        // Switch to login page
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        
        // Clear forms
        document.getElementById('loginForm').reset();
        document.getElementById('signupForm').reset();
        
        // Clear any stored data
        window.doctors = [];
        window.receptionists = [];
        window.notifications = [];
        
        // Stop system monitoring
        if (typeof window.stopSystemMonitoring === 'function') {
            window.stopSystemMonitoring();
        }
        
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed: ' + error.message);
    }
};

// Check for existing session
window.checkSession = async function() {
    try {
        if (!window.supabase) {
            console.error('Supabase client not initialized');
            return;
        }
        
        const { data: { session }, error } = await window.supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            window.currentUser = session.user;
            
            // Check for stored user data
            const storedUser = localStorage.getItem('clinicUser');
            let userData = storedUser ? JSON.parse(storedUser) : null;
            
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'flex';
            
            // Get user profile if not in storage
            if (!userData) {
                const { data: profile, error: profileError } = await window.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', window.currentUser.id)
                    .single();
                    
                if (!profileError && profile) {
                    userData = {
                        id: window.currentUser.id,
                        email: session.user.email,
                        name: profile.full_name
                    };
                } else {
                    userData = {
                        id: window.currentUser.id,
                        email: session.user.email,
                        name: session.user.email.split('@')[0]
                    };
                }
            }

            document.getElementById('userName').textContent = userData?.name || 'Admin User';
            document.getElementById('userEmail').textContent = session.user.email;
            document.getElementById('welcomeName').textContent = userData?.name?.split(' ')[0] || session.user.email.split('@')[0];

            // Load initial data
            if (typeof window.loadDoctors === 'function') window.loadDoctors();
            if (typeof window.loadReceptionists === 'function') window.loadReceptionists();
            if (typeof window.loadDashboardData === 'function') window.loadDashboardData();
            if (typeof window.loadAnalytics === 'function') window.loadAnalytics();
            if (typeof window.startSystemMonitoring === 'function') window.startSystemMonitoring();
        }
    } catch (error) {
        console.error('Session check failed:', error);
    }
};