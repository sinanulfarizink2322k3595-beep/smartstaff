const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/availability - public
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT a.id, a.day_of_week, a.slot, a.start_time, a.end_time,
           u.id as staff_id, u.name as staff_name, u.department
    FROM availability a
    JOIN users u ON a.staff_id = u.id
    ORDER BY u.name, a.day_of_week, a.slot
  `).all();
  res.json(rows);
});

// GET /api/availability/my - staff only
router.get('/my', authenticateToken, requireRole('staff'), (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM availability WHERE staff_id = ? ORDER BY day_of_week, slot
  `).all(req.user.id);
  res.json(rows);
});

// PUT /api/availability - staff only, replace all slots
router.put('/', authenticateToken, requireRole('staff'), (req, res) => {
  const { slots } = req.body;
  if (!Array.isArray(slots)) return res.status(400).json({ error: 'slots must be an array' });

  const del = db.prepare('DELETE FROM availability WHERE staff_id = ?');
  const ins = db.prepare('INSERT INTO availability (staff_id, day_of_week, slot, start_time, end_time) VALUES (?, ?, ?, ?, ?)');

  const txn = db.transaction(() => {
    del.run(req.user.id);
    for (const s of slots) {
      ins.run(req.user.id, s.day_of_week, s.slot, s.start_time, s.end_time);
    }
  });
  txn();

  res.json({ message: 'Availability updated successfully' });
});

module.exports = router;
