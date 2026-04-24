App({
  globalData: {
    userId: [],
    isBound: false,
    userInfo: [],
    baseUrl: 'https://backend.lt02r.cn'  //后端
  },
  
  onLaunch() {
    // 强制清理可能引起崩溃的旧缓存数据，但保留登录态
    const userId = wx.getStorageSync('userId');
    const isBound = wx.getStorageSync('isBound');
    
    // 我们在这里加上强制清理缓存的逻辑，再把登录态放回去
    wx.clearStorageSync();
    
    if (userId) {
      wx.setStorageSync('userId', userId);
      wx.setStorageSync('isBound', isBound);
      this.globalData.userId = userId;
      this.globalData.isBound = isBound;
    }
  }
});