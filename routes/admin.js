const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/admin/stats
router.get('/stats', authenticateToken, requireRole('admin'), (req, res) => {
  const studentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
  const staffCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'staff'").get().count;
  const pendingOutpasses = db.prepare("SELECT COUNT(*) as count FROM outpasses WHERE status = 'pending'").get().count;
  const pendingMeetings = db.prepare("SELECT COUNT(*) as count FROM meetings WHERE status = 'pending'").get().count;

  res.json({ studentCount, staffCount, pendingOutpasses, pendingMeetings });
});

// GET /api/admin/students
router.get('/students', authenticateToken, requireRole('admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, email, roll_number, department, is_verified, created_at
    FROM users WHERE role = 'student' ORDER BY created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/admin/staff
router.get('/staff', authenticateToken, requireRole('admin'), (req, res) => {
  const staff = db.prepare(`
    SELECT id, name, email, department, is_verified, created_at FROM users WHERE role = 'staff'
  `).all();

  const result = staff.map(s => {
    const availability = db.prepare('SELECT * FROM availability WHERE staff_id = ?').all(s.id);
    return { ...s, availability };
  });

  res.json(result);
});

// GET /api/admin/outpasses
router.get('/outpasses', authenticateToken, requireRole('admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, u.name as student_name, u.email as student_email, u.roll_number
    FROM outpasses o
    JOIN users u ON o.student_id = u.id
    ORDER BY o.created_at DESC
  `).all();
  res.json(rows);
});

// GET /api/admin/meetings
router.get('/meetings', authenticateToken, requireRole('admin'), (req, res) => {
  const rows = db.prepare(`
    SELECT m.*,
           s.name as student_name, s.email as student_email, s.roll_number,
           st.name as staff_name, st.department as staff_department
    FROM meetings m
    JOIN users s ON m.student_id = s.id
    JOIN users st ON m.staff_id = st.id
    ORDER BY m.created_at DESC
  `).all();
  res.json(rows);
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  // Prevent deleting own account
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Prevent deleting the last admin
  if (target.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin account' });
    }
  }

  // Cascade-delete related records for staff/student
  if (target.role === 'staff') {
    db.prepare('DELETE FROM availability WHERE staff_id = ?').run(targetId);
    db.prepare('DELETE FROM meetings WHERE staff_id = ?').run(targetId);
  }
  if (target.role === 'student') {
    db.prepare('DELETE FROM outpasses WHERE student_id = ?').run(targetId);
    db.prepare('DELETE FROM meetings WHERE student_id = ?').run(targetId);
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ message: 'User deleted successfully' });
});

module.exports = router;
