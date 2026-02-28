const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/meetings - student creates meeting request
router.post('/', authenticateToken, requireRole('student'), (req, res) => {
  const { staff_id, purpose, preferred_date, preferred_time } = req.body;
  if (!staff_id || !purpose || !preferred_date || !preferred_time) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const staff = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'staff'").get(staff_id);
  if (!staff) return res.status(404).json({ error: 'Staff member not found' });

  const result = db.prepare(`
    INSERT INTO meetings (student_id, staff_id, purpose, preferred_date, preferred_time, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(req.user.id, staff_id, purpose, preferred_date, preferred_time);

  res.status(201).json({ message: 'Meeting request submitted', id: result.lastInsertRowid });
});

// GET /api/meetings/my - student or staff views their meetings
router.get('/my', authenticateToken, (req, res) => {
  let rows;
  if (req.user.role === 'student') {
    rows = db.prepare(`
      SELECT m.*, u.name as staff_name, u.department as staff_department
      FROM meetings m
      JOIN users u ON m.staff_id = u.id
      WHERE m.student_id = ?
      ORDER BY m.created_at DESC
    `).all(req.user.id);
  } else if (req.user.role === 'staff') {
    rows = db.prepare(`
      SELECT m.*, u.name as student_name, u.email as student_email, u.roll_number
      FROM meetings m
      JOIN users u ON m.student_id = u.id
      WHERE m.staff_id = ?
      ORDER BY m.created_at DESC
    `).all(req.user.id);
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(rows);
});

// PUT /api/meetings/:id - staff confirms/rejects meeting
router.put('/:id', authenticateToken, requireRole('staff'), (req, res) => {
  const { status, staff_comment } = req.body;
  if (!status || !['confirmed', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be confirmed or rejected' });
  }

  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  if (meeting.staff_id !== req.user.id) return res.status(403).json({ error: 'You can only update your own meetings' });

  db.prepare(`UPDATE meetings SET status = ?, staff_comment = ? WHERE id = ?`).run(status, staff_comment || null, req.params.id);
  res.json({ message: `Meeting ${status} successfully` });
});

module.exports = router;
