
// ==================== SUPABASE CONFIGURATION ====================
// Replace these with your Supabase credentials
const SUPABASE_URL = 'https://supabase.com/dashboard/project/ymhyvfzsjtjkrksyljsj';
const SUPABASE_ANON_KEY = 'sb_publishable_jluTskdgXYNRNBEJCWRnjA_karCmflU';

// Initialize Supabase client - FIXED: Use correct initialization
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let doctors = [];
let receptionists = [];
let notifications = [];
let charts = {};

// Make variables globally available
window.currentUser = currentUser;
window.doctors = doctors;
window.receptionists = receptionists;
window.notifications = notifications;
window.charts = charts;
window.supabase = supabase;