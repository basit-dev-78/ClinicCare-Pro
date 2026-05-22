const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { randomUUID } = require('crypto');
const registerUserRoutes = require('./user');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB || 'cliniccarepro';
const collectionName = process.env.MONGO_COLLECTION || 'users';

app.use(cors());
app.use(express.json());

const client = new MongoClient(mongoUri, {
  maxPoolSize: 20,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000
});

function generateToken(payload) {
  const tokenId = randomUUID();
  const signedToken = jwt.sign({ ...payload, id: payload.id || payload._id?.toString(), tokenId }, JWT_SECRET, { expiresIn: '24h', jwtid: tokenId });
  return { token: signedToken, tokenId };
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'Unknown';
}

async function startServer() {
  try {
    await client.connect();
    console.log(`Connected to MongoDB at ${mongoUri}`);
    const db = client.db(dbName);
    const users = db.collection(collectionName);
    const loginHistory = db.collection('login_history');
    const appointments = db.collection('appointments');
    const departments = db.collection('departments');
    const auditLogs = db.collection('audit_log');
    const billing = db.collection('billing');
    const medicalRecords = db.collection('medical_records');
    const prescriptions = db.collection('prescriptions');

    const vitals = db.collection('vitals');
    const inventory = db.collection('inventory');
    const suppliers = db.collection('suppliers');
    const settingsCol = db.collection('settings');

    // JWT verification middleware
    async function authenticateToken(req, res, next) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id || decoded.userId;
        if (!ObjectId.isValid(userId)) {
          return res.status(403).json({ success: false, message: 'Invalid token payload' });
        }

        const dbUser = await users.findOne({ _id: new ObjectId(userId) });
        if (!dbUser) return res.status(401).json({ success: false, message: 'User not found' });
        if (dbUser.blocked) return res.status(403).json({ success: false, message: 'Your account is blocked.' });
        
        // Session validation
        if (dbUser.token !== token || (decoded.tokenId && dbUser.tokenId !== decoded.tokenId)) {
          return res.status(403).json({ success: false, message: 'Session invalid' });
        }

        req.user = dbUser;
        next();
      } catch (err) {
        console.error('Auth Middleware Error:', err.message);
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
      }
    }

    // Auth Routes
    app.post('/api/signup', async (req, res) => {
      try {
        const { name, email, phone, role, password, specialization } = req.body;
        if (!name || !email || !phone || !role || !password) return res.status(400).json({ success: false, message: 'Missing fields' });
        
        const existing = await users.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ success: false, message: 'Email exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userDoc = { name, email: email.toLowerCase(), phone, role, specialization: specialization || '', password: hashedPassword, blocked: false, createdAt: new Date() };
        const result = await users.insertOne(userDoc);
        const savedUser = { id: result.insertedId.toString(), ...userDoc };
        delete savedUser.password;

        const { token, tokenId } = generateToken(savedUser);
        await users.updateOne({ _id: result.insertedId }, { $set: { token, tokenId } });
        res.status(201).json({ success: true, user: savedUser, token, tokenId });
      } catch (e) { 
        console.error('Signup Error:', e);
        res.status(500).json({ success: false, message: 'Internal Server Error' }); 
      }
    });

    app.post('/api/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await users.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (user.blocked) return res.status(403).json({ success: false, message: 'Blocked' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        await loginHistory.insertOne({ userId: user._id.toString(), userName: user.name, email: user.email, role: user.role, timestamp: new Date(), ip: getClientIp(req), status: 'success' });

        const authUser = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
        const { token, tokenId } = generateToken(authUser);
        await users.updateOne({ _id: user._id }, { $set: { token, tokenId } });
        res.json({ success: true, user: authUser, token, tokenId });
      } catch (e) { 
        console.error('Login Error:', e);
        res.status(500).json({ success: false, message: 'Internal Server Error' }); 
      }
    });

    // Register User CRUD routes from user.js
    registerUserRoutes({ app, users, authenticateToken, bcrypt, ObjectId });

    // Login History
    app.get('/api/login-history', authenticateToken, async (req, res) => {
      try {
        const history = await loginHistory.find({}).sort({ timestamp: -1 }).limit(100).toArray();
        res.json({ success: true, history: history.map(h => ({ ...h, _id: h._id.toString() })) });
      } catch (e) { 
        console.error('Fetch Login History Error:', e);
        res.status(500).json({ success: false, message: 'Internal Server Error' }); 
      }
    });
    app.delete('/api/login-history/:id', authenticateToken, async (req, res) => {
      try {
        await loginHistory.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true });
      } catch (e) { 
        console.error('Delete Login History Error:', e);
        res.status(500).json({ success: false, message: 'Internal Server Error' }); 
      }
    });
    
    app.delete('/api/login-history', authenticateToken, async (req, res) => {
      try {
        await loginHistory.deleteMany({});
        res.json({ success: true, message: 'History cleared' });
      } catch (e) { 
        console.error('Clear Login History Error:', e);
        res.status(500).json({ success: false, message: 'Internal Server Error' }); 
      }
    });

    // Settings API
    app.get('/api/settings', authenticateToken, async (req, res) => {
      try {
        let currentSettings = await settingsCol.findOne({ id: 'admin_settings' });
        if (!currentSettings) {
           currentSettings = {
             id: 'admin_settings',
             clinicName: 'ClinicCare Pro Medical Center',
             adminEmail: 'admin@cliniccare.pro',
             phone: '+1 234 567 8900',
             address: '123 Health Ave, Medical District',
             timezone: 'UTC',
             currency: 'USD',
             dateFormat: 'MM/DD/YYYY',
             theme: 'light',
             twoFactorAuth: false,
             sessionTimeout: '30',
             notifAppointments: true,
             notifDailySummary: true,
             notifAlerts: true
           };
           await settingsCol.insertOne(currentSettings);
        }
        res.json({ success: true, settings: currentSettings });
      } catch (e) {
        console.error('Fetch Settings Error:', e);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
    });

    app.put('/api/settings', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
        const updateData = { ...req.body };
        delete updateData._id;
        delete updateData.id;
        await settingsCol.updateOne({ id: 'admin_settings' }, { $set: updateData }, { upsert: true });
        res.json({ success: true, message: 'Settings updated successfully' });
      } catch (e) {
        console.error('Update Settings Error:', e);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
    });

    // Medical Records
    app.get('/api/medical-records', authenticateToken, async (req, res) => {
      try {
        let query = {};
        if (req.user.role === 'patient') query = { patientId: req.user._id.toString() };
        if (req.user.role === 'doctor') query = { doctorId: req.user._id.toString() };
        const records = await medicalRecords.find(query).toArray();
        res.json(records.map(r => ({ ...r, id: r._id.toString() })));
      } catch (e) { 
        console.error('Fetch Medical Records Error:', e);
        res.status(500).json({ error: 'Failed to fetch medical records' }); 
      }
    });
    app.post('/api/medical-records', authenticateToken, async (req, res) => {
      try {
        const result = await medicalRecords.insertOne(req.body);
        res.json({ ...req.body, id: result.insertedId.toString() });
      } catch (e) { 
        console.error('Create Medical Record Error:', e);
        res.status(500).json({ error: 'Failed to create medical record' }); 
      }
    });

    // Prescriptions
    app.get('/api/prescriptions', authenticateToken, async (req, res) => {
      try {
        let query = {};
        if (req.user.role === 'patient') query = { patientId: req.user._id.toString() };
        if (req.user.role === 'doctor') query = { doctorId: req.user._id.toString() };
        const data = await prescriptions.find(query).toArray();
        res.json(data.map(p => ({ ...p, id: p._id.toString() })));
      } catch (e) { 
        console.error('Fetch Prescriptions Error:', e);
        res.status(500).json({ error: 'Failed to fetch prescriptions' }); 
      }
    });
    app.post('/api/prescriptions', authenticateToken, async (req, res) => {
      try {
        const result = await prescriptions.insertOne(req.body);
        res.json({ ...req.body, id: result.insertedId.toString() });
      } catch (e) { 
        console.error('Create Prescription Error:', e);
        res.status(500).json({ error: 'Failed to create prescription' }); 
      }
    });

    // Billing
    app.get('/api/billing', authenticateToken, async (req, res) => {
      try {
        let query = {};
        if (req.user.role === 'patient') query = { patientId: req.user._id.toString() };
        const allBills = await billing.find(query).toArray();
        res.json(allBills.map(b => ({ ...b, id: b._id.toString() })));
      } catch (e) { 
        console.error('Fetch Billing Error:', e);
        res.status(500).json({ error: 'Failed to fetch billing data' }); 
      }
    });
    app.post('/api/billing', authenticateToken, async (req, res) => {
      try {
        const result = await billing.insertOne(req.body);
        res.json({ ...req.body, id: result.insertedId.toString() });
      } catch (e) { 
        console.error('Create Billing Error:', e);
        res.status(500).json({ error: 'Failed to create billing entry' }); 
      }
    });
    app.put('/api/billing/:id', authenticateToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: id };
        await billing.updateOne(query, { $set: req.body });
        res.json({ success: true });
      } catch (e) { 
        console.error('Update Billing Error:', e);
        res.status(500).json({ error: 'Failed to update billing invoice' }); 
      }
    });

    // Appointments
    app.get('/api/appointments', authenticateToken, async (req, res) => {
      try {
        let query = {};
        if (req.user.role === 'patient') query = { patientId: req.user._id.toString() };
        if (req.user.role === 'doctor') query = { doctorId: req.user._id.toString() };
        const allApps = await appointments.find(query).toArray();
        res.json(allApps.map(a => ({ ...a, id: a._id.toString() })));
      } catch (e) { 
        console.error('Fetch Appointments Error:', e);
        res.status(500).json({ error: 'Failed to fetch appointments' }); 
      }
    });
    app.post('/api/appointments', authenticateToken, async (req, res) => {
      try {
        const result = await appointments.insertOne(req.body);
        res.json({ ...req.body, id: result.insertedId.toString() });
      } catch (e) { 
        console.error('Create Appointment Error:', e);
        res.status(500).json({ error: 'Failed to create appointment' }); 
      }
    });
    app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: id };
        await appointments.updateOne(query, { $set: req.body });
        res.json({ success: true });
      } catch (e) { 
        console.error('Update Appointment Error:', e);
        res.status(500).json({ error: 'Failed to update appointment' }); 
      }
    });
    app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: id };
        await appointments.deleteOne(query);
        res.json({ success: true });
      } catch (e) { 
        console.error('Delete Appointment Error:', e);
        res.status(500).json({ error: 'Failed to delete appointment' }); 
      }
    });

    // Vitals
    app.get('/api/vitals', authenticateToken, async (req, res) => {
      try {
        let query = {};
        if (req.user.role === 'patient') query = { patientId: req.user._id.toString() };
        const all = await vitals.find(query).toArray();
        res.json(all.map(v => ({ ...v, id: v._id.toString() })));
      } catch (e) { 
        console.error('Fetch Vitals Error:', e);
        res.status(500).json({ error: 'Failed to fetch vitals' }); 
      }
    });
    app.post('/api/vitals', authenticateToken, async (req, res) => {
      try {
        const result = await vitals.insertOne(req.body);
        res.json({ ...req.body, id: result.insertedId.toString() });
      } catch (e) { 
        console.error('Create Vital Error:', e);
        res.status(500).json({ error: 'Failed to create vital' }); 
      }
    });

    // Inventory
    app.get('/api/inventory', authenticateToken, async (req, res) => {
      try {
        const all = await inventory.find({}).toArray();
        res.json(all.map(i => ({ ...i, id: i._id.toString() })));
      } catch (e) { 
        console.error('Fetch Inventory Error:', e);
        res.status(500).json({ error: 'Failed to fetch inventory' }); 
      }
    });
    app.post('/api/inventory', authenticateToken, async (req, res) => {
      try {
        const result = await inventory.insertOne(req.body);
        res.json({ ...req.body, id: result.insertedId.toString() });
      } catch (e) { 
        console.error('Create Inventory Error:', e);
        res.status(500).json({ error: 'Failed to create inventory item' }); 
      }
    });

    // Suppliers
    app.get('/api/suppliers', authenticateToken, async (req, res) => {
      try {
        const all = await suppliers.find({}).toArray();
        res.json(all.map(s => ({ ...s, id: s._id.toString() })));
      } catch (e) { 
        console.error('Fetch Suppliers Error:', e);
        res.status(500).json({ error: 'Failed to fetch suppliers' }); 
      }
    });
    app.post('/api/suppliers', authenticateToken, async (req, res) => {
      try {
        const result = await suppliers.insertOne(req.body);
        res.json({ ...req.body, id: result.insertedId.toString() });
      } catch (e) { 
        console.error('Create Supplier Error:', e);
        res.status(500).json({ error: 'Failed to create supplier' }); 
      }
    });

    // Departments
    app.get('/api/departments', authenticateToken, async (req, res) => {
      try {
        const all = await departments.find({}).toArray();
        res.json(all.map(d => ({ ...d, id: d._id.toString() })));
      } catch (e) { 
        console.error('Fetch Departments Error:', e);
        res.status(500).json({ error: 'Failed to fetch departments' }); 
      }
    });

    // Audit Logs
    app.get('/api/audit-logs', authenticateToken, async (req, res) => {
      try {
        const logs = await auditLogs.find({}).sort({ timestamp: -1 }).limit(100).toArray();
        res.json(logs.map(l => ({ ...l, id: l._id.toString() })));
      } catch (e) { 
        console.error('Fetch Audit Logs Error:', e);
        res.status(500).json({ error: 'Failed to fetch audit logs' }); 
      }
    });
    app.post('/api/audit-logs', authenticateToken, async (req, res) => {
      try {
        const log = { 
          ...req.body, 
          timestamp: new Date(),
          ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          ua: req.headers['user-agent']
        };
        await auditLogs.insertOne(log);
        res.json({ success: true });
      } catch (e) { 
        console.error('Create Audit Log Error:', e);
        res.status(500).json({ error: 'Failed to create audit log' }); 
      }
    });


    app.listen(port, () => {
      console.log(`ClinicCare Pro API listening on http://localhost:${port}`);
    });

  } catch (err) {
    console.error('SERVER START ERROR:', err);
    process.exit(1);
  }
}

startServer();