const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, roll_number, department } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  try {
    db.prepare(`
      INSERT INTO users (name, email, password, role, roll_number, department, is_verified, verification_token)
      VALUES (?, ?, ?, 'student', ?, ?, 0, ?)
    `).run(name, email, hashedPassword, roll_number || null, department || null, verificationToken);

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      verificationToken // In production this would be emailed
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

  if (!user.is_verified) return res.status(403).json({ error: 'Please verify your email before logging in' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, department: user.department },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      roll_number: user.roll_number
    }
  });
});

// GET /api/auth/verify-email?token=TOKEN
router.get('/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Verification token required' });

  const user = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

  db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
  res.json({ message: 'Email verified successfully. You can now log in.' });
});

module.exports = router;
