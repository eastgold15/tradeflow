export interface SiteCategoryDetailRes {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  parentId?: any;
  sortOrder: number;
  siteId: string;
  description?: string;
  masterCategoryId?: string;
  url?: string;
}

// 获取分类下的商品列表
export type SiteCategoryProductRes = {
  slug: string;
  id: string;
  displayName: string;
  displayDesc: string;
  mainMedia: string;
  minPrice: string;
  spuCode: string;
  isFeatured: boolean | null;
};

// 获取站点商品列表（支持搜索和分页）
export type SiteProductListRes = {
  items: {
    siteProductId: string;
    displayName: string;
    displayDesc: string;
    isFeatured: boolean | null;
    sortOrder: number | null;
    productId: string;
    spuCode: string;
    minPrice: string;
    mainMedia: string;
    slug: string;
  }[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
