const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/outpass - student creates outpass
router.post('/', authenticateToken, requireRole('student'), (req, res) => {
  const { reason, destination, from_date, to_date } = req.body;
  if (!reason || !destination || !from_date || !to_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const result = db.prepare(`
    INSERT INTO outpasses (student_id, reason, destination, from_date, to_date, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(req.user.id, reason, destination, from_date, to_date);

  res.status(201).json({ message: 'Outpass request submitted', id: result.lastInsertRowid });
});

// GET /api/outpass/my - student views their outpasses
router.get('/my', authenticateToken, requireRole('student'), (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM outpasses WHERE student_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

// GET /api/outpass/pending - HOD/admin views pending outpasses
router.get('/pending', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && !(req.user.role === 'staff' && req.user.department === 'HOD')) {
    return res.status(403).json({ error: 'HOD or admin access required' });
  }
  const rows = db.prepare(`
    SELECT o.*, u.name as student_name, u.email as student_email, u.roll_number
    FROM outpasses o
    JOIN users u ON o.student_id = u.id
    WHERE o.status = 'pending'
    ORDER BY o.created_at DESC
  `).all();
  res.json(rows);
});

// PUT /api/outpass/:id - HOD approves/rejects
router.put('/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && !(req.user.role === 'staff' && req.user.department === 'HOD')) {
    return res.status(403).json({ error: 'HOD or admin access required' });
  }

  const { status, hod_comment } = req.body;
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const outpass = db.prepare('SELECT id FROM outpasses WHERE id = ?').get(req.params.id);
  if (!outpass) return res.status(404).json({ error: 'Outpass not found' });

  db.prepare(`
    UPDATE outpasses SET status = ?, hod_comment = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, hod_comment || null, req.params.id);

  res.json({ message: `Outpass ${status} successfully` });
});

module.exports = router;
