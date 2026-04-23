App({
  globalData: {
    userId: null,
    isBound: false,
    userInfo: null,
    baseUrl: 'http://106.53.76.214:3000'  //后端
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
