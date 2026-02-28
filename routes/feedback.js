const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/feedback
router.post('/', (req, res) => {
  const { name, email, subject, message, rating } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  db.prepare(`
    INSERT INTO feedback (name, email, subject, message, rating) VALUES (?, ?, ?, ?, ?)
  `).run(name || null, email || null, subject || null, message, rating || null);

  res.status(201).json({ message: 'Feedback submitted successfully' });
});

// GET /api/feedback - admin only
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  const rows = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all();
  res.json(rows);
});

module.exports = router;
