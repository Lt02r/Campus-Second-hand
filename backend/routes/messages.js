const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const router = express.Router();

// Get messages for an item
router.get('/item/:itemId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT m.*, u.nickname, u.avatar_url, u.college FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.item_id = ? ORDER BY m.created_at ASC',
      [req.params.itemId]
    );
    res.json({ code: 0, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Post a message
router.post('/', auth, async (req, res) => {
  if (!req.user.is_bound) return res.status(403).json({ code: 403, msg: '请先完成学号绑定' });
  const { itemId, content } = req.body;
  if (!itemId || !content) return res.status(400).json({ code: 400, msg: '缺少参数' });
  if (content.length > 500) return res.status(400).json({ code: 400, msg: '留言内容过长' });
  try {
    const [itemRows] = await pool.query('SELECT id FROM items WHERE id=?', [itemId]);
    if (itemRows.length === 0) return res.status(404).json({ code: 404, msg: '物品不存在' });
    const [result] = await pool.query(
      'INSERT INTO messages (item_id, sender_id, content) VALUES (?,?,?)',
      [itemId, req.user.id, content]
    );
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Get my messages (messages I sent)
router.get('/my', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT m.*, i.title as item_title, i.status as item_status FROM messages m JOIN items i ON m.item_id = i.id WHERE m.sender_id = ? ORDER BY m.created_at DESC',
      [req.user.id]
    );
    res.json({ code: 0, data: rows });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;
