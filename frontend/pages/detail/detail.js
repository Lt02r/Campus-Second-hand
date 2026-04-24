const { request, fullImageUrl } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    item: null,
    messages: [],
    messageContent: '',
    loading: false,
    currentUserId: null,
    STATUS_MAP: { available: '在售', traded: '已交易', offline: '已下架' }
  },
  onLoad(options) {
    const stored = wx.getStorageSync('userId');
    this.setData({ currentUserId: stored ? Number(stored) : null });
    if (options.id) {
      this.loadItem(options.id);
      this.loadMessages(options.id);
    }
  },
  async loadItem(id) {
    try {
      const res = await request(`/api/items/${id}`);
      if (res.code === 0) {
        const item = { ...res.data, images: res.data.images.map(fullImageUrl) };
        this.setData({ item });
        wx.setNavigationBarTitle({ title: item.title });
      }
    } catch (e) {}
  },
  async loadMessages(id) {
    try {
      const res = await request(`/api/messages/item/${id}`);
      if (res.code === 0) {
        // 使用 || [] 确保即使后端返回 null 或 undefined，也会赋值为空数组
        this.setData({ messages: res.data || [] });
      }
    } catch (e) {}
  },
  onMessageInput(e) {
    this.setData({ messageContent: e.detail.value });
  },
  async onSendMessage() {
    if (!wx.getStorageSync('userId')) {
      return wx.navigateTo({ url: '/pages/login/login' });
    }
    if (!wx.getStorageSync('isBound')) {
      return wx.showToast({ title: '请先完成学号绑定', icon: 'none' });
    }
    const { messageContent, item } = this.data;
    if (!messageContent.trim()) return wx.showToast({ title: '请输入留言内容', icon: 'none' });
    this.setData({ loading: true });
    try {
      const res = await request('/api/messages', 'POST', { itemId: item.id, content: messageContent });
      if (res.code === 0) {
        this.setData({ messageContent: '' });
        this.loadMessages(item.id);
        wx.showToast({ title: '留言成功', icon: 'success' });
      } else {
        wx.showToast({ title: res.msg || '留言失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '留言失败，请重试', icon: 'none' });
    }
    this.setData({ loading: false });
  },
  onEditItem() {
    wx.navigateTo({ url: `/pages/publish/publish?id=${this.data.item.id}` });
  },
  async onChangeStatus(e) {
    const { status } = e.currentTarget.dataset;
    const statusText = { traded: '标记为已交易', offline: '下架', available: '重新上架' };
    wx.showModal({
      title: '确认',
      content: `确定要${statusText[status]}吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const r = await request(`/api/items/${this.data.item.id}`, 'PUT', { status });
            if (r.code === 0) {
              wx.showToast({ title: '操作成功', icon: 'success' });
              this.loadItem(this.data.item.id);
            }
          } catch (e) {}
        }
      }
    });
  },
  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({ urls: this.data.item.images, current: url });
  }
});
