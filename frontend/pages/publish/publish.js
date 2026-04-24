const { request, fullImageUrl } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    title: '',
    categoryIndex: 0,
    categories: [
      { value: 'textbook', label: '教材' },
      { value: 'electronics', label: '电子' },
      { value: 'daily', label: '生活' }
    ],
    price: '',
    description: '',
    locationIndex: 0,
    locations: ['图书馆', '宿舍区', '教学楼', '操场附近', '校门口', '其他'],
    images: [],
    loading: false,
    // Edit mode
    editId: null
  },
  onLoad(options) {
    if (!wx.getStorageSync('userId')) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    if (!wx.getStorageSync('isBound')) {
      wx.showToast({ title: '请先完成学号绑定', icon: 'none' });
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    if (options.id) {
      this.setData({ editId: options.id });
      this.loadItem(options.id);
    }
  },
  async loadItem(id) {
    try {
      const res = await request(`/api/items/${id}`);
      if (res.code === 0) {
        const item = res.data;
        const categoryIndex = this.data.categories.findIndex(c => c.value === item.category);
        const locationIndex = this.data.locations.indexOf(item.location);
        
        // 增加防御:
        const safeImages = Array.isArray(item.images) ? item.images : [];
        
        this.setData({
          title: item.title,
          categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
          price: String(item.price),
          description: item.description,
          locationIndex: locationIndex >= 0 ? locationIndex : 0,
          images: safeImages.map(fullImageUrl) // 修改这里！
        });
      }
    } catch (e) {}
  },
  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onCategoryChange(e) { this.setData({ categoryIndex: parseInt(e.detail.value) }); },
  onPriceInput(e) { this.setData({ price: e.detail.value }); },
  onDescInput(e) { this.setData({ description: e.detail.value }); },
  onLocationChange(e) { this.setData({ locationIndex: parseInt(e.detail.value) }); },
  onChooseImage() {
    const { images } = this.data;
    if (images.length >= 3) return wx.showToast({ title: '最多上传3张图片', icon: 'none' });
    wx.chooseImage({
      count: 3 - images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        for (const path of res.tempFilePaths) {
          await this.uploadImage(path);
        }
      }
    });
  },
  async uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: app.globalData.baseUrl + '/api/items/upload',
        filePath,
        name: 'image',
        header: { 'x-user-id': wx.getStorageSync('userId') || '' },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              const images = [...this.data.images, app.globalData.baseUrl + data.data.url];
              this.setData({ images });
            }
          } catch (e) {}
          resolve();
        },
        fail: reject
      });
    });
  },
  removeImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = this.data.images.filter((_, i) => i !== index);
    this.setData({ images });
  },
  resetForm() {
    this.setData({
      title: '',
      categoryIndex: 0,
      price: '',
      description: '',
      locationIndex: 0,
      images: [],
      editId: null
    });
  },
  async onSubmit() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const failSubmit = (title) => {
      wx.showToast({ title, icon: 'none' });
      this.setData({ loading: false });
      return;
    };
    const { title, categories, categoryIndex, price, description, locations, locationIndex, images, editId } = this.data;
    if (!title) return failSubmit('请输入物品名称');
    if (!price) return failSubmit('请输入价格');
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) return failSubmit('请输入有效价格');
    if (images.length === 0) return failSubmit('请至少上传一张图片');
    // Strip baseUrl prefix so backend receives relative paths like /uploads/xxx
    const baseUrl = getApp().globalData.baseUrl;
    const relativeImages = images.map(img => img.startsWith(baseUrl) ? img.slice(baseUrl.length) : img);
    const body = {
      title,
      category: categories[categoryIndex].value,
      price: parsedPrice,
      description,
      location: locations[locationIndex],
      images: relativeImages
    };
    try {
      let res;
      if (editId) {
        res = await request(`/api/items/${editId}`, 'PUT', body);
      } else {
        res = await request('/api/items', 'POST', body);
      }
      if (res.code === 0) {
        wx.showToast({ title: editId ? '修改成功' : '发布成功', icon: 'success' });
        this.resetForm();
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1200);
      } else {
        wx.showToast({ title: res.msg || '操作失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
