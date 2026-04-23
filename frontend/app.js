App({
  globalData: {
    userId: null,
    isBound: false,
    userInfo: null,
    baseUrl: 'https://backend.lt02r.cn'  //后端
  },
  onLaunch() {
    const userId = wx.getStorageSync('userId');
    const isBound = wx.getStorageSync('isBound');
    if (userId) {
      this.globalData.userId = userId;
      this.globalData.isBound = isBound;
    }
  }
});
