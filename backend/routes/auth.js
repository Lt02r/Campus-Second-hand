const express = require('express');
const axios = require('axios');
const pool = require('../config/db');
const router = express.Router();

const COLLEGES = [
  '计算机与信息工程学院',
  '商学院',
  '文学院',
  '理工学院',
  '艺术学院',
  '外国语学院',
  '教育学院',
  '法学院',
  '医学院',
  '经济管理学院'
];

// WeChat login
router.post('/login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ code: 400, msg: '缺少code参数' });
  try {
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const wxRes = await axios.get(url);
    const { openid, errcode, errmsg } = wxRes.data;
    if (errcode) return res.status(400).json({ code: 400, msg: errmsg || '微信登录失败' });

    let [rows] = await pool.query('SELECT * FROM users WHERE openid = ?', [openid]);
    let user;
    if (rows.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (openid) VALUES (?)',
        [openid]
      );
      const [newRows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = newRows[0];
    } else {
      user = rows[0];
    }
    res.json({ code: 0, data: { userId: user.id, isBound: user.is_bound === 1, nickname: user.nickname, avatarUrl: user.avatar_url } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Bind student ID
router.post('/bind', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ code: 401, msg: '未登录' });
  const { studentId, college, nickname, avatarUrl } = req.body;
  if (!studentId || !college) return res.status(400).json({ code: 400, msg: '缺少参数' });

  // Validate student ID format: 10 digits, first 2 digits are year
  const studentIdRegex = /^\d{10}$/;
  if (!studentIdRegex.test(studentId)) {
    return res.status(400).json({ code: 400, msg: '学号格式错误，请输入10位数字学号' });
  }
  const idYear = parseInt(studentId.substring(0, 2));
  const fullYear = new Date().getFullYear();
  const currentYear2 = fullYear % 100;
  const currentCentury = fullYear - currentYear2;
  // Map the 2-digit year to a 4-digit year (support previous century wrap)
  let idFullYear = currentCentury + idYear;
  if (idFullYear > fullYear + 1) idFullYear -= 100; // wrap back a century
  if (idFullYear > fullYear || idFullYear < fullYear - 10) {
    return res.status(400).json({ code: 400, msg: '学号年份不合法' });
  }
  if (!COLLEGES.includes(college)) {
    return res.status(400).json({ code: 400, msg: '学院名称不合法' });
  }
  try {
    await pool.query(
      'UPDATE users SET student_id=?, college=?, nickname=?, avatar_url=?, is_bound=1 WHERE id=?',
      [studentId, college, nickname || '', avatarUrl || '', userId]
    );
    res.json({ code: 0, msg: '绑定成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Get college list
router.get('/colleges', (req, res) => {
  res.json({ code: 0, data: COLLEGES });
});

// Get user info
router.get('/user', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ code: 401, msg: '未登录' });
  try {
    const [rows] = await pool.query('SELECT id, nickname, avatar_url, student_id, college, is_bound, created_at FROM users WHERE id=?', [userId]);
    if (rows.length === 0) return res.status(404).json({ code: 404, msg: '用户不存在' });
    res.json({ code: 0, data: rows[0] });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// Update user profile
router.put('/user', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ code: 401, msg: '未登录' });
  const { nickname, avatarUrl } = req.body || {};
  try {
    const [rows] = await pool.query('SELECT id, nickname, avatar_url FROM users WHERE id=?', [userId]);
    if (rows.length === 0) return res.status(404).json({ code: 404, msg: '用户不存在' });
    const currentUser = rows[0];
    const nextNickname = nickname === undefined ? (currentUser.nickname || '') : String(nickname).trim();
    const nextAvatarUrl = avatarUrl === undefined ? (currentUser.avatar_url || '') : String(avatarUrl).trim();
    if (nextNickname.length > 50) return res.status(400).json({ code: 400, msg: '昵称长度不能超过50' });
    if (nextAvatarUrl.length > 500) return res.status(400).json({ code: 400, msg: '头像地址过长' });

    await pool.query('UPDATE users SET nickname=?, avatar_url=? WHERE id=?', [nextNickname, nextAvatarUrl, userId]);
    res.json({ code: 0, msg: '保存成功', data: { nickname: nextNickname, avatar_url: nextAvatarUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;
