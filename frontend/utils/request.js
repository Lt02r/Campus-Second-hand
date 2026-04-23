const app = getApp();

const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    const userId = wx.getStorageSync('userId');
    wx.request({
      url: app.globalData.baseUrl + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'x-user-id': userId || ''
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
};

/**
 * Prepend baseUrl to relative image paths returned by the server.
 * Paths starting with 'http' are returned as-is.
 */
const fullImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return app.globalData.baseUrl + path;
};

module.exports = { request, fullImageUrl };
