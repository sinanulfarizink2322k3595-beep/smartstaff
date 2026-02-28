const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/availability', apiLimiter, require('./routes/availability'));
app.use('/api/outpass', apiLimiter, require('./routes/outpass'));
app.use('/api/meetings', apiLimiter, require('./routes/meeting'));
app.use('/api/admin', apiLimiter, require('./routes/admin'));
app.use('/api/feedback', apiLimiter, require('./routes/feedback'));

// Root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SmartStaff server running on http://localhost:${PORT}`);
});
