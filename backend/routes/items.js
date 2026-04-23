const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const router = express.Router();

// Multer config for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只允许上传图片'));
  }
});

// Upload image
router.post('/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, msg: '请选择图片' });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ code: 0, data: { url: imageUrl } });
});

// Get item list
router.get('/', async (req, res) => {
  const { category, minPrice, maxPrice, sort = 'newest', page = 1, pageSize = 10, keyword } = req.query;
  let sql = `SELECT i.*, u.nickname, u.college, u.avatar_url FROM items i JOIN users u ON i.user_id = u.id WHERE i.status = 'available'`;
  const params = [];
  if (category) { sql += ' AND i.category = ?'; params.push(category); }
  if (minPrice) { sql += ' AND i.price >= ?'; params.push(parseFloat(minPrice)); }
  if (maxPrice) { sql += ' AND i.price <= ?'; params.push(parseFloat(maxPrice)); }
  if (keyword) { sql += ' AND i.title LIKE ?'; params.push(`%${keyword}%`); }
  if (sort === 'priceAsc') {
    sql += ' ORDER BY i.price ASC';
  } else if (sort === 'priceDesc') {
    sql += ' ORDER BY i.price DESC';
  } else {
    sql += ' ORDER BY i.created_at DESC';
  }
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  try {
    const [rows] = await pool.query(sql, params);
    res.json({ code: 0, data: rows.map(r => ({ ...r, images: JSON.parse(r.images || '[]') })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Get my items
router.get('/my', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ code: 0, data: rows.map(r => ({ ...r, images: JSON.parse(r.images || '[]') })) });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Get item detail
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT i.*, u.nickname, u.college, u.avatar_url, u.student_id FROM items i JOIN users u ON i.user_id = u.id WHERE i.id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ code: 404, msg: '物品不存在' });
    const item = rows[0];
    item.images = JSON.parse(item.images || '[]');
    res.json({ code: 0, data: item });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Create item
router.post('/', auth, async (req, res) => {
  if (!req.user.is_bound) return res.status(403).json({ code: 403, msg: '请先完成学号绑定' });
  const { title, category, price, description, images, location } = req.body;
  if (!title || !category || price === undefined) return res.status(400).json({ code: 400, msg: '缺少必要参数' });
  const validCategories = ['textbook', 'electronics', 'daily'];
  if (!validCategories.includes(category)) return res.status(400).json({ code: 400, msg: '分类不合法' });
  if (isNaN(parseFloat(price)) || parseFloat(price) < 0) return res.status(400).json({ code: 400, msg: '价格不合法' });
  try {
    const rawImages = Array.isArray(images) ? images.slice(0, 3) : [];
    const validImages = rawImages.filter(img => typeof img === 'string' && img.startsWith('/uploads/'));
    const imagesJson = JSON.stringify(validImages);
    const [result] = await pool.query(
      'INSERT INTO items (user_id, title, category, price, description, images, location) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, title, category, parseFloat(price), description || '', imagesJson, location || '']
    );
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Update item
router.put('/:id', auth, async (req, res) => {
  const { title, category, price, description, images, location, status } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM items WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, msg: '物品不存在或无权限' });
    const item = rows[0];
    const updates = {
      title: title || item.title,
      category: category || item.category,
      price: price !== undefined ? parseFloat(price) : item.price,
      description: description !== undefined ? description : item.description,
      images: images
        ? JSON.stringify((Array.isArray(images) ? images.slice(0, 3) : []).filter(img => typeof img === 'string' && img.startsWith('/uploads/')))
        : item.images,
      location: location !== undefined ? location : item.location,
      status: status || item.status
    };
    await pool.query(
      'UPDATE items SET title=?,category=?,price=?,description=?,images=?,location=?,status=? WHERE id=?',
      [updates.title, updates.category, updates.price, updates.description, updates.images, updates.location, updates.status, req.params.id]
    );
    res.json({ code: 0, msg: '更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Delete item
router.delete('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, msg: '物品不存在或无权限' });
    await pool.query('DELETE FROM messages WHERE item_id=?', [req.params.id]);
    await pool.query('DELETE FROM items WHERE id=?', [req.params.id]);
    res.json({ code: 0, msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;
