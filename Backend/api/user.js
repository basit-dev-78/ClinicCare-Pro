const userSwagger = require('./user.swagger.json');

function mapSafeUser(user) {
  return {
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
    profilePic: user.profilePic || '',
    blocked: !!user.blocked,
    createdAt: user.createdAt
  };
}

function isValidObjectId(ObjectId, id) {
  return typeof id === 'string' && ObjectId.isValid(id);
}

module.exports = function registerUserRoutes({
  app,
  users,
  authenticateToken,
  bcrypt,
  ObjectId
}) {
  app.get('/api/users/swagger.json', (req, res) => {
    res.json(userSwagger);
  });

  app.get('/api/doctors', async (req, res) => {
    try {
      const allDoctors = await users.find({ role: 'doctor' }).sort({ createdAt: -1 }).toArray();
      res.json({ success: true, doctors: allDoctors.map(mapSafeUser) });
    } catch (error) {
      console.error('Fetch doctors error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
    }
  });

  app.get('/api/users', authenticateToken, async (req, res) => {
    try {
      const allUsers = await users.find({}).sort({ createdAt: -1 }).toArray();
      res.json({ success: true, users: allUsers.map(mapSafeUser) });
    } catch (error) {
      console.error('Fetch users error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  });

  app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(ObjectId, id)) {
        return res.status(400).json({ success: false, message: 'Invalid user id' });
      }

      const user = await users.findOne({ _id: new ObjectId(id) });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, user: mapSafeUser(user) });
    } catch (error) {
      console.error('Fetch user by id error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  });
  app.post
    ('/api/users', authenticateToken, async (req, res) => {
      try {
        const { name, email, phone, role, password, specialization } = req.body;
        if (!name || !email || !phone || !role || !password) {
          return res.status(400).json({ success: false, message: 'Name, email, phone, role, and password are required.' });
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
          createdAt: new Date(),
          token: null,
          tokenId: null
        };

        const result = await users.insertOne(userDoc);
        res.status(201).json({
          success: true,
          message: 'User created successfully',
          user: mapSafeUser({ ...userDoc, _id: result.insertedId })
        });
      } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
      }
    });

  app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(ObjectId, id)) {
        return res.status(400).json({ success: false, message: 'Invalid user id' });
      }

      const existingUser = await users.findOne({ _id: new ObjectId(id) });
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const { name, email, phone, role, password, specialization, blocked, bio, education, experience, languages, fees, availability, appointmentDuration, bufferTime, maxPatients, notifications } = req.body;
      const updateData = {};

      if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
      if (typeof phone === 'string') updateData.phone = phone.trim();
      if (typeof role === 'string' && role.trim()) updateData.role = role.trim();
      if (typeof specialization === 'string') updateData.specialization = specialization.trim();
      if (typeof blocked === 'boolean') updateData.blocked = blocked;

      // New fields
      if (typeof bio === 'string') updateData.bio = bio.trim();
      if (typeof education === 'string') updateData.education = education.trim();
      if (typeof experience === 'string') updateData.experience = experience.trim();
      if (typeof languages === 'string') updateData.languages = languages.trim();
      if (typeof fees === 'object') updateData.fees = fees;
      if (typeof availability === 'object') updateData.availability = availability;
      if (typeof appointmentDuration === 'number') updateData.appointmentDuration = appointmentDuration;
      if (typeof bufferTime === 'number') updateData.bufferTime = bufferTime;
      if (typeof maxPatients === 'number') updateData.maxPatients = maxPatients;
      if (typeof notifications === 'object') updateData.notifications = notifications;
      if (typeof req.body.profilePic === 'string') updateData.profilePic = req.body.profilePic;

      if (typeof email === 'string' && email.trim()) {
        const normalizedEmail = email.trim().toLowerCase();
        const emailOwner = await users.findOne({ email: normalizedEmail });
        if (emailOwner && emailOwner._id.toString() !== id) {
          return res.status(409).json({ success: false, message: 'This email is already registered.' });
        }
        updateData.email = normalizedEmail;
      }

      if (typeof password === 'string' && password.trim()) {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
      }

      if (updateData.blocked === true) {
        updateData.token = null;
        updateData.tokenId = null;
      }

      await users.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
      const updatedUser = await users.findOne({ _id: new ObjectId(id) });

      res.json({
        success: true,
        message: 'User updated successfully',
        user: mapSafeUser(updatedUser)
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(ObjectId, id)) {
        return res.status(400).json({ success: false, message: 'Invalid user id' });
      }

      const result = await users.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
  });

  app.put('/api/users/:id/block', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { blocked } = req.body;

      if (!isValidObjectId(ObjectId, id)) {
        return res.status(400).json({ success: false, message: 'Invalid user id' });
      }

      if (typeof blocked !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Blocked status must be true or false.' });
      }

      const targetUser = await users.findOne({ _id: new ObjectId(id) });
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const updatePayload = { blocked };
      if (blocked) {
        updatePayload.token = null;
        updatePayload.tokenId = null;
      }

      await users.updateOne({ _id: targetUser._id }, { $set: updatePayload });
      res.json({ success: true, message: `User ${blocked ? 'blocked' : 'unblocked'} successfully` });
    } catch (error) {
      console.error('Block/unblock user error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user status' });
    }
  });
};
