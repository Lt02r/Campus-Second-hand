const { request, fullImageUrl } = require('../../utils/request');
const CATEGORY_MAP = { textbook: '教材', electronics: '电子', daily: '生活' };

Page({
  data: {
    items: [],
    keyword: '',
    category: '',
    categoryIndex: 0,
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    sortIndex: 0,
    page: 1,
    loading: false,
    hasMore: true,
    categories: [
      { value: '', label: '全部' },
      { value: 'textbook', label: '教材' },
      { value: 'electronics', label: '电子' },
      { value: 'daily', label: '生活' }
    ],
    sortOptions: [
      { value: 'newest', label: '最新' },
      { value: 'priceAsc', label: '价格↑' },
      { value: 'priceDesc', label: '价格↓' }
    ],
    CATEGORY_MAP
  },
  onLoad() {
    this.loadItems(true);
  },
  onPullDownRefresh() {
    this.loadItems(true);
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadItems(false);
    }
  },
  async loadItems(refresh = false) {
    if (this.data.loading) return;
    const page = refresh ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const queryParts = [
        `page=${page}`,
        `pageSize=10`,
        `sort=${this.data.sort}`
      ];
      if (this.data.keyword) queryParts.push(`keyword=${encodeURIComponent(this.data.keyword)}`);
      if (this.data.category) queryParts.push(`category=${this.data.category}`);
      if (this.data.minPrice) queryParts.push(`minPrice=${this.data.minPrice}`);
      if (this.data.maxPrice) queryParts.push(`maxPrice=${this.data.maxPrice}`);
      const res = await request('/api/items?' + queryParts.join('&'));
      if (res.code === 0) {
        const newItems = res.data.map(item => ({
          ...item,
          images: item.images.map(fullImageUrl)
        }));
        this.setData({
          items: refresh ? newItems : this.data.items.concat(newItems),
          page: page + 1,
          hasMore: newItems.length === 10,
          loading: false
        });
      }
    } catch (e) {
      this.setData({ loading: false });
    }
    wx.stopPullDownRefresh();
  },
  onSearch(e) {
    // bindconfirm passes detail.value; bindtap (search button) does not
    if (e.detail && e.detail.value !== undefined) {
      this.setData({ keyword: e.detail.value });
    }
    this.loadItems(true);
  },
  onCategoryChange(e) {
    const categoryIndex = parseInt(e.detail.value, 10);
    this.setData({
      categoryIndex,
      category: this.data.categories[categoryIndex].value
    });
    this.loadItems(true);
  },
  onSortChange(e) {
    const sortIndex = parseInt(e.detail.value, 10);
    this.setData({
      sortIndex,
      sort: this.data.sortOptions[sortIndex].value
    });
    this.loadItems(true);
  },
  onMinPriceInput(e) {
    this.setData({ minPrice: e.detail.value });
  },
  onMaxPriceInput(e) {
    this.setData({ maxPrice: e.detail.value });
  },
  onPriceFilter() {
    this.loadItems(true);
  },
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
});
