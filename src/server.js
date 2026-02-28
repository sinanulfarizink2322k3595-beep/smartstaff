'use strict';

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory staff store
let staff = [
  { id: 1, name: 'Alice Johnson', role: 'Manager', department: 'Engineering', email: 'alice@smartstaff.com' },
  { id: 2, name: 'Bob Smith', role: 'Developer', department: 'Engineering', email: 'bob@smartstaff.com' },
  { id: 3, name: 'Carol White', role: 'Designer', department: 'Product', email: 'carol@smartstaff.com' },
];
let nextId = 4;

// GET all staff
app.get('/api/staff', (req, res) => {
  res.json(staff);
});

// GET a single staff member
app.get('/api/staff/:id', (req, res) => {
  const member = staff.find(s => s.id === parseInt(req.params.id, 10));
  if (!member) return res.status(404).json({ error: 'Staff member not found' });
  res.json(member);
});

// POST create a new staff member
app.post('/api/staff', (req, res) => {
  const { name, role, department, email } = req.body;
  if (!name || !role || !department || !email) {
    return res.status(400).json({ error: 'name, role, department, and email are required' });
  }
  const member = { id: nextId++, name, role, department, email };
  staff.push(member);
  res.status(201).json(member);
});

// PUT update a staff member
app.put('/api/staff/:id', (req, res) => {
  const index = staff.findIndex(s => s.id === parseInt(req.params.id, 10));
  if (index === -1) return res.status(404).json({ error: 'Staff member not found' });
  const { name, role, department, email } = req.body;
  if (name) staff[index].name = name;
  if (role) staff[index].role = role;
  if (department) staff[index].department = department;
  if (email) staff[index].email = email;
  res.json(staff[index]);
});

// DELETE a staff member
app.delete('/api/staff/:id', (req, res) => {
  const index = staff.findIndex(s => s.id === parseInt(req.params.id, 10));
  if (index === -1) return res.status(404).json({ error: 'Staff member not found' });
  staff.splice(index, 1);
  res.status(204).send();
});

// Only start listening when run directly (not during tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SmartStaff server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
