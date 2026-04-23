require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '请求过于频繁，请稍后再试' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '登录请求过于频繁，请稍后再试' }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/items', apiLimiter, require('./routes/items'));
app.use('/api/messages', apiLimiter, require('./routes/messages'));

app.get('/api/health', (req, res) => {
  res.json({ code: 0, msg: 'Server is running' });
});

app.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
