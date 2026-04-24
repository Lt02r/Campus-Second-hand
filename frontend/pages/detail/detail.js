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
        let rawImages = res.data.images;
        
        // 1. 打印日誌：讓我們先看看數據庫裡到底存了什麼
        console.log('【調試】後端返回的原始 images:', rawImages, '類型:', typeof rawImages);

        // 2. 終極防禦解析邏輯
        if (typeof rawImages === 'string') {
          try {
            // 嘗試當作 JSON 數組解析 (例如: '["/uploads/1.jpg"]')
            rawImages = JSON.parse(rawImages);
          } catch (e) {
            // 如果報錯，說明不是標準 JSON，嘗試當作逗號分隔解析 (例如: '/uploads/1.jpg,/uploads/2.jpg')
            rawImages = rawImages.split(',').filter(url => url.trim() !== '');
          }
        }

        // 3. 確保最終結果一定是數組
        const finalImages = Array.isArray(rawImages) ? rawImages : [];
        console.log('【調試】處理後的最終 images 數組:', finalImages);

        // 4. 拼接完整 URL
        const item = { 
          ...res.data, 
          images: finalImages.map(url => fullImageUrl(url)),
          avatar_url: fullImageUrl(res.data.avatar_url) 
        };
        console.log('【調試】準備渲染的最終圖片URL:', item.images);
        this.setData({ item });
        wx.setNavigationBarTitle({ title: item.title || '商品詳情' });
      }
    } catch (e) {
      console.error('加載商品詳情失敗', e);
    }
  },

  async loadMessages(id) {
    try {
      const res = await request(`/api/messages/item/${id}`);
      if (res.code === 0) {
        const messages = (Array.isArray(res.data) ? res.data : []).map(msg => ({
          ...msg,
          avatar_url: fullImageUrl(msg.avatar_url)
        }));
        this.setData({ messages: Array.isArray(res.data) ? res.data : [] });
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
      return wx.showToast({ title: '請先完成學號綁定', icon: 'none' });
    }
    const { messageContent, item } = this.data;
    if (!messageContent.trim()) return wx.showToast({ title: '請輸入留言內容', icon: 'none' });
    
    this.setData({ loading: true });
    try {
      const res = await request('/api/messages', 'POST', { itemId: item.id, content: messageContent });
      if (res.code === 0) {
        this.setData({ messageContent: '' });
        this.loadMessages(item.id);
        wx.showToast({ title: '留言成功', icon: 'success' });
      } else {
        wx.showToast({ title: res.msg || '留言失敗', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '留言失敗，請重試', icon: 'none' });
    }
    this.setData({ loading: false });
  },

  onEditItem() {
    const id = this.data.item.id; 
    getApp().globalData.editItemId = id;
    wx.switchTab({ url: '/pages/publish/publish' });
  },

  async onChangeStatus(e) {
    const { status } = e.currentTarget.dataset;
    const statusText = { traded: '標記為已交易', offline: '下架', available: '重新上架' };
    wx.showModal({
      title: '確認',
      content: `確定要${statusText[status]}嗎？`,
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
    if (!this.data.item || !this.data.item.images) return;
    wx.previewImage({ urls: this.data.item.images, current: url });
  }
});