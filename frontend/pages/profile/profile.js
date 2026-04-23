const { request, fullImageUrl } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    userInfo: null,
    editNickname: '',
    editAvatarUrl: '',
    savingProfile: false,
    myItems: [],
    myMessages: [],
    activeTab: 'items',
    STATUS_MAP: { available: '在售', traded: '已交易', offline: '已下架' },
    CATEGORY_MAP: { textbook: '教材', electronics: '电子', daily: '生活' }
  },
  onShow() {
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      this.setData({ userInfo: null, myItems: [], myMessages: [] });
      return;
    }
    this.loadUserInfo();
    this.loadMyItems();
    this.loadMyMessages();
  },
  async loadUserInfo() {
    try {
      const res = await request('/api/auth/user');
      if (res.code === 0) {
        this.setData({
          userInfo: res.data,
          editNickname: res.data.nickname || '',
          editAvatarUrl: res.data.avatar_url || ''
        });
      }
    } catch (e) {}
  },
  async loadMyItems() {
    try {
      const res = await request('/api/items/my');
      if (res.code === 0) {
        this.setData({ myItems: res.data.map(item => ({ ...item, images: item.images.map(fullImageUrl) })) });
      }
    } catch (e) {}
  },
  async loadMyMessages() {
    try {
      const res = await request('/api/messages/my');
      if (res.code === 0) this.setData({ myMessages: res.data });
    } catch (e) {}
  },
  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },
  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value });
  },
  onChooseAvatar(e) {
    if (e.detail && e.detail.avatarUrl) {
      this.setData({ editAvatarUrl: e.detail.avatarUrl });
    }
  },
  fillWxProfile(userInfo = {}) {
    this.setData({
      editNickname: userInfo.nickName || this.data.editNickname,
      editAvatarUrl: userInfo.avatarUrl || this.data.editAvatarUrl
    });
  },
  onAuthorizeProfile() {
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于完善头像和昵称',
        success: (res) => this.fillWxProfile(res.userInfo || {}),
        fail: () => wx.showToast({ title: '未授权获取微信资料', icon: 'none' })
      });
      return;
    }
    if (wx.getUserInfo) {
      wx.getUserInfo({
        success: (res) => this.fillWxProfile((res && res.userInfo) || {}),
        fail: () => wx.showToast({ title: '未授权获取微信资料', icon: 'none' })
      });
      return;
    }
    wx.showToast({ title: '当前微信版本不支持', icon: 'none' });
  },
  async onSaveProfile() {
    if (this.data.savingProfile) return;
    const nickname = (this.data.editNickname || '').trim();
    const avatarUrl = (this.data.editAvatarUrl || '').trim();
    if (nickname.length > 50) return wx.showToast({ title: '昵称最多50字', icon: 'none' });
    this.setData({ savingProfile: true });
    try {
      const res = await request('/api/auth/user', 'PUT', { nickname, avatarUrl });
      if (res.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.loadUserInfo();
      } else {
        wx.showToast({ title: res.msg || '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
    this.setData({ savingProfile: false });
  },
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },
  goToEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/publish/publish?id=${id}` });
  },
  async onDeleteItem(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确认删除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const r = await request(`/api/items/${id}`, 'DELETE');
            if (r.code === 0) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              this.loadMyItems();
            }
          } catch (e) {}
        }
      }
    });
  },
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userId');
          wx.removeStorageSync('isBound');
          app.globalData.userId = null;
          app.globalData.isBound = false;
          this.setData({ userInfo: null, myItems: [], myMessages: [] });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  }
});
