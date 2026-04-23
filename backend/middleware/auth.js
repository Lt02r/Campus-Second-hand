const pool = require('../config/db');

async function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ code: 401, msg: '未登录' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(401).json({ code: 401, msg: '用户不存在' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(500).json({ code: 500, msg: '服务器错误' });
  }
}

module.exports = authMiddleware;
