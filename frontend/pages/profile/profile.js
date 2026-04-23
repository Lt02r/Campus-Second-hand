const { request, fullImageUrl } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    userInfo: null,
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
      if (res.code === 0) this.setData({ userInfo: res.data });
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
