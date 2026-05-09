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

function generateToken(payload) {
  const tokenId = randomUUID();
  const signedToken = jwt.sign({ ...payload, tokenId }, JWT_SECRET, { expiresIn: '24h', jwtid: tokenId });
  return { token: signedToken, tokenId };
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'Unknown';
}

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

async function startServer() {
  await client.connect();
  console.log(`Connected to MongoDB at ${mongoUri}`);
  const db = client.db(dbName);
  const users = db.collection(collectionName);
  const loginHistory = db.collection('login_history');
  const appointments = db.collection('appointments');
  const departments = db.collection('departments');
  const auditLogs = db.collection('audit_log');
  const billing = db.collection('billing');

  app.post('/api/signup', async (req, res) => {
    try {
      const { name, email, phone, role, password, specialization } = req.body;
      if (!name || !email || !phone || !role || !password) {
        return res.status(400).json({ success: false, message: 'Missing required signup fields.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await users.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({ success: false, message: 'This email is already registered.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userDoc = {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        role: role.trim(),
        specialization: specialization ? specialization.trim() : '',
        password: hashedPassword,
        blocked: false,
        createdAt: new Date()
      };

      const result = await users.insertOne(userDoc);
      const savedUser = {
        id: result.insertedId.toString(),
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone,
        role: userDoc.role,
        specialization: userDoc.specialization,
        bio: '',
        education: '',
        experience: '',
        languages: '',
        fees: { online: 0, inPerson: 0, followUp: 0 },
        availability: {},
        appointmentDuration: 15,
        bufferTime: 0,
        maxPatients: 20,
        notifications: { email: true, sms: true, browser: false }
      };

      const { token, tokenId } = generateToken(savedUser);
      await users.updateOne(
        { _id: result.insertedId },
        { $set: { token, tokenId } }
      );

      return res.status(201).json({ success: true, user: savedUser, token, tokenId });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ success: false, message: 'Unable to create account. Please try again.' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await users.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Blocked users cannot start a new session.
      if (user.blocked) {
        return res.status(403).json({ success: false, message: 'This user is blocked by admin.' });
      }

      let passwordMatches = false;
      if (user.password && typeof user.password === 'string') {
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
          passwordMatches = await bcrypt.compare(password, user.password);
        } else {
          passwordMatches = user.password === password;
          if (passwordMatches) {
            const newHash = await bcrypt.hash(password, 10);
            await users.updateOne({ _id: user._id }, { $set: { password: newHash } });
          }
        }
      }

      if (!passwordMatches) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Save login history
      await loginHistory.insertOne({
        userId: user._id.toString(),
        userName: user.name,
        email: user.email,
        role: user.role,
        timestamp: new Date(),
        ip: getClientIp(req),
        userAgent: req.get('User-Agent') || 'Unknown',
        status: user.blocked ? 'blocked' : 'active'
      });

      const authUser = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialization: user.specialization || '',
        bio: user.bio || '',
        education: user.education || '',
        experience: user.experience || '',
        languages: user.languages || '',
        fees: user.fees || { online: 0, inPerson: 0, followUp: 0 },
        availability: user.availability || {},
        appointmentDuration: user.appointmentDuration || 15,
        bufferTime: user.bufferTime || 0,
        maxPatients: user.maxPatients || 20,
        notifications: user.notifications || { email: true, sms: true, browser: false },
        profilePic: user.profilePic || ''
      };

      const { token, tokenId } = generateToken(authUser);
      await users.updateOne(
        { _id: user._id },
        { $set: { token, tokenId } }
      );

      return res.json({
        success: true,
        user: authUser,
        token,
        tokenId
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Unable to sign in. Please try again.' });
    }
  });

  registerUserRoutes({
    app,
    users,
    authenticateToken,
    bcrypt,
    ObjectId
  });

  app.get('/api/login-history', authenticateToken, async (req, res) => {
    try {
      const history = await loginHistory.find({}).sort({ timestamp: -1 }).toArray();
      const userIds = [...new Set(history
        .map(entry => entry.userId)
        .filter(value => value && ObjectId.isValid(value))
        .map(value => value.toString()))];

      let userLookup = new Map();
      if (userIds.length > 0) {
        const relatedUsers = await users.find({
          _id: { $in: userIds.map(id => new ObjectId(id)) }
        }).toArray();

        userLookup = new Map(
          relatedUsers.map(user => [
            user._id.toString(),
            {
              name: user.name,
              role: user.role,
              blocked: !!user.blocked
            }
          ])
        );
      }

      const safeHistory = history.map(entry => {
        const normalizedUserId = entry.userId ? entry.userId.toString() : '';
        const relatedUser = userLookup.get(normalizedUserId);
        const loginTime = entry.timestamp ? new Date(entry.timestamp) : null;

        return {
          _id: entry._id.toString(),
          userId: normalizedUserId,
          userName: entry.userName || relatedUser?.name || 'Unknown User',
          email: entry.email || '',
          role: entry.role || relatedUser?.role || 'unknown',
          timestamp: loginTime ? loginTime.toISOString() : null,
          ip: entry.ip || 'Unknown',
          userAgent: entry.userAgent || 'Unknown',
          blocked: relatedUser?.blocked || false,
          status: relatedUser?.blocked ? 'blocked' : (entry.status || 'active')
        };
      });

      res.json({ success: true, history: safeHistory });
    } catch (error) {
      console.error('Fetch login history error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch login history' });
    }
  });

  app.post('/api/login-history', authenticateToken, async (req, res) => {
    try {
      const entry = req.body;
      const result = await loginHistory.insertOne(entry);
      res.status(201).json({ success: true, id: result.insertedId });
    } catch (error) {
      console.error('Add login history error:', error);
      res.status(500).json({ success: false, message: 'Failed to add login history' });
    }
  });

  app.put('/api/login-history/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      delete updateData._id;
      const result = await loginHistory.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Login history entry not found' });
      }
      res.json({ success: true, message: 'Login history entry updated' });
    } catch (error) {
      console.error('Update login history error:', error);
      res.status(500).json({ success: false, message: 'Failed to update login history' });
    }
  });

  app.delete('/api/login-history/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await loginHistory.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Login history entry not found' });
      }
      res.json({ success: true, message: 'Login history entry deleted' });
    } catch (error) {
      console.error('Delete login history error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete login history' });
    }
  });

  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await users.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ success: false, message: 'No account found with that email.' });
      }

      return res.json({ success: true, email: normalizedEmail });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ success: false, message: 'Unable to process request.' });
    }
  });

  app.post('/api/reset-password', async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ success: false, message: 'Missing email or new password.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateResult = await users.updateOne(
        { email: normalizedEmail },
        { $set: { password: hashedPassword } }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'No account found with that email.' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ success: false, message: 'Unable to reset password.' });
    }
  });

  // JWT verification middleware
  async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!ObjectId.isValid(decoded.id)) {
        return res.status(403).json({ success: false, message: 'Invalid token payload' });
      }

      const dbUser = await users.findOne({ _id: new ObjectId(decoded.id) });
      if (!dbUser) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (dbUser.blocked) {
        return res.status(403).json({ success: false, message: 'Your account has been blocked by admin.' });
      }

      if (dbUser.token !== token || (decoded.tokenId && dbUser.tokenId !== decoded.tokenId)) {
        return res.status(403).json({ success: false, message: 'Session is no longer valid. Please sign in again.' });
      }

      req.user = {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        specialization: dbUser.specialization || '',
        bio: dbUser.bio || '',
        education: dbUser.education || '',
        experience: dbUser.experience || '',
        languages: dbUser.languages || '',
        fees: dbUser.fees || { online: 0, inPerson: 0, followUp: 0 },
        availability: dbUser.availability || {},
        appointmentDuration: dbUser.appointmentDuration || 15,
        bufferTime: dbUser.bufferTime || 0,
        maxPatients: dbUser.maxPatients || 20,
        notifications: dbUser.notifications || { email: true, sms: true, browser: false },
        profilePic: dbUser.profilePic || '',
        tokenId: decoded.tokenId
      };
      next();
    } catch (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
  }

  // Verify token endpoint
  app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user });
  });

  // Additional CRUD Endpoints
  app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
      const allApps = await appointments.find({}).toArray();
      res.json(allApps.map(a => ({ ...a, id: a._id.toString() })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.post('/api/appointments', authenticateToken, async (req, res) => {
    try {
      const newApp = req.body;
      const result = await appointments.insertOne(newApp);
      res.json({ ...newApp, id: result.insertedId.toString(), _id: result.insertedId });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
      let id = req.params.id;
      const updateData = req.body;
      delete updateData.id;
      delete updateData._id;
      // Handle the case where the ID from the frontend is not a valid ObjectId (e.g. mock data "A101" still creeping in)
      let query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: id };
      await appointments.updateOne(query, { $set: updateData });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
      let id = req.params.id;
      let query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: id };
      await appointments.deleteOne(query);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  app.get('/api/departments', authenticateToken, async (req, res) => {
    try {
      const allDeps = await departments.find({}).toArray();
      res.json(allDeps.map(d => ({ ...d, id: d._id.toString() })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  app.get('/api/audit-logs', authenticateToken, async (req, res) => {
    try {
      const logs = await auditLogs.find({}).sort({ _id: -1 }).limit(100).toArray();
      res.json(logs.map(l => ({ ...l, id: l._id.toString() })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.post('/api/audit-logs', authenticateToken, async (req, res) => {
    try {
      const log = req.body;
      log.timestamp = log.timestamp || new Date().toLocaleString();
      const result = await auditLogs.insertOne(log);
      res.json({ ...log, id: result.insertedId.toString() });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  app.get('/api/billing', authenticateToken, async (req, res) => {
    try {
      const allBills = await billing.find({}).toArray();
      res.json(allBills.map(b => ({ ...b, id: b._id.toString() })));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.post('/api/billing', authenticateToken, async (req, res) => {
    try {
      const newBill = req.body;
      const result = await billing.insertOne(newBill);
      res.json({ ...newBill, id: result.insertedId.toString(), _id: result.insertedId });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });
  app.put('/api/billing/:id', authenticateToken, async (req, res) => {
    try {
      let id = req.params.id;
      const updateData = req.body;
      delete updateData.id;
      delete updateData._id;
      let query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id: id };
      await billing.updateOne(query, { $set: updateData });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
  });

  app.listen(port, () => {
    console.log(`ClinicCare Pro API listening on http://localhost:${port}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});