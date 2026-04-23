const { request } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    step: 'login', // 'login' or 'bind'
    studentId: '',
    nickname: '',
    avatarUrl: '',
    college: '',
    colleges: [],
    collegeIndex: 0,
    loading: false
  },
  onLoad() {
    this.loadColleges();
    // 获取本地缓存
    const userId = wx.getStorageSync('userId');
    const isBound = wx.getStorageSync('isBound');
    
    if (userId && !isBound) {
      this.setData({ step: 'bind' });
    }
  },
  async loadColleges() {
    try {
      const res = await request('/api/auth/colleges');
      if (res && res.code === 0) {
        this.setData({ colleges: res.data });
        console.log('学院列表加载成功:', res.data);
      } else {
        console.error('后台返回了错误:', res);
        wx.showToast({ title: res.msg || '加载失败', icon: 'none' });
      }
    } catch (e) {
      console.error('网络请求彻底失败:', e);
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  },
  onWxLogin() {
    this.setData({ loading: true });
    wx.login({
      success: async (loginRes) => {
        try {
          const res = await request('/api/auth/login', 'POST', { code: loginRes.code });
          if (res.code === 0) {
            wx.setStorageSync('userId', res.data.userId);
            wx.setStorageSync('isBound', res.data.isBound);
            app.globalData.userId = res.data.userId;
            app.globalData.isBound = res.data.isBound;
            if (res.data.isBound) {
              wx.showToast({ title: '登录成功', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 1500);
            } else {
              this.setData({
                step: 'bind',
                nickname: res.data.nickname || '',
                avatarUrl: res.data.avatarUrl || '',
                loading: false
              });
            }
          } else {
            wx.showToast({ title: res.msg || '登录失败', icon: 'none' });
            this.setData({ loading: false });
          }
        } catch (e) {
          wx.showToast({ title: '登录失败，请重试', icon: 'none' });
          this.setData({ loading: false });
        }
      },
      fail: () => {
        wx.showToast({ title: '微信登录失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },
  onStudentIdInput(e) {
    this.setData({ studentId: e.detail.value });
  },
  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },
  onChooseAvatar(e) {
    if (e.detail && e.detail.avatarUrl) {
      this.setData({ avatarUrl: e.detail.avatarUrl });
    }
  },
  onGetWxProfile() {
    wx.getUserProfile({
      desc: '用于完善头像和昵称',
      success: (res) => {
        const userInfo = res.userInfo || {};
        this.setData({
          nickname: userInfo.nickName || this.data.nickname,
          avatarUrl: userInfo.avatarUrl || this.data.avatarUrl
        });
      },
      fail: () => {
        wx.showToast({ title: '未授权获取微信资料', icon: 'none' });
      }
    });
  },
  onCollegeChange(e) {
    this.setData({ collegeIndex: e.detail.value });
  },
  async onBind() {
    const { studentId, nickname, avatarUrl, colleges, collegeIndex } = this.data;
    if (!studentId) return wx.showToast({ title: '请输入学号', icon: 'none' });
    if (colleges.length === 0) return wx.showToast({ title: '请等待学院列表加载', icon: 'none' });
    const studentIdRegex = /^\d{10}$/;
    if (!studentIdRegex.test(studentId)) return wx.showToast({ title: '请输入正确的10位学号', icon: 'none' });
    const trimmedNickname = (nickname || '').trim();
    if (trimmedNickname.length > 50) return wx.showToast({ title: '昵称最多50字', icon: 'none' });
    this.setData({ loading: true });
    try {
      const res = await request('/api/auth/bind', 'POST', {
        studentId,
        college: colleges[collegeIndex],
        nickname: trimmedNickname,
        avatarUrl: avatarUrl || ''
      });
      if (res.code === 0) {
        wx.setStorageSync('isBound', true);
        app.globalData.isBound = true;
        wx.showToast({ title: '绑定成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: res.msg || '绑定失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
    }
    this.setData({ loading: false });
  }
});
