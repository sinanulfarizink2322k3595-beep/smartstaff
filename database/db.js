const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'smartstaff.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    department TEXT,
    roll_number TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    day_of_week TEXT NOT NULL,
    slot TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS outpasses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    destination TEXT NOT NULL,
    from_date TEXT NOT NULL,
    to_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    hod_comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    preferred_date TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    staff_comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (staff_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    rating INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed data
function seedData() {
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@smartstaff.com');
  if (adminExists) return;

  // Admin
  const adminHash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)`).run(
    'Administrator', 'admin@smartstaff.com', adminHash, 'admin', 1
  );

  // Staff members
  const staffMembers = [
    { name: 'DR. Archana', email: 'archana@smartstaff.com', department: 'HOD' },
    { name: 'Pavithra', email: 'pavithra@smartstaff.com', department: 'Faculty' },
    { name: 'Jima', email: 'jima@smartstaff.com', department: 'Faculty' },
    { name: 'Anusree', email: 'anusree@smartstaff.com', department: 'Faculty' },
    { name: 'Renjith', email: 'renjith@smartstaff.com', department: 'Faculty' },
    { name: 'Sreedhanya', email: 'sreedhanya@smartstaff.com', department: 'Faculty' }
  ];

  const staffHash = bcrypt.hashSync('staff123', 10);
  const insertStaff = db.prepare(`INSERT INTO users (name, email, password, role, department, is_verified) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertAvailability = db.prepare(`INSERT INTO availability (staff_id, day_of_week, slot, start_time, end_time) VALUES (?, ?, ?, ?, ?)`);

  const afternoonDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const morningDays = ['Monday', 'Wednesday', 'Friday'];

  for (const staff of staffMembers) {
    const result = insertStaff.run(staff.name, staff.email, staffHash, 'staff', staff.department, 1);
    const staffId = result.lastInsertRowid;

    // Afternoon slots: Monday-Saturday
    for (const day of afternoonDays) {
      insertAvailability.run(staffId, day, 'afternoon', '14:00', '17:00');
    }
    // Morning slots: Monday, Wednesday, Friday
    for (const day of morningDays) {
      insertAvailability.run(staffId, day, 'morning', '09:00', '12:00');
    }
  }

  // Demo students
  const studentHash = bcrypt.hashSync('student123', 10);
  db.prepare(`INSERT INTO users (name, email, password, role, roll_number, department, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    'Student One', 'student1@smartstaff.com', studentHash, 'student', 'STU001', 'Computer Science', 1
  );
  db.prepare(`INSERT INTO users (name, email, password, role, roll_number, department, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    'Student Two', 'student2@smartstaff.com', studentHash, 'student', 'STU002', 'Electronics', 1
  );

  console.log('Database seeded successfully.');
}

seedData();

module.exports = db;
