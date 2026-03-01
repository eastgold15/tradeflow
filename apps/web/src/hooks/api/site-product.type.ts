// 类型定义 - Product List 返回的是 SiteProduct 列表
export type ProductListItem = {
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
};

export type ProductListRes = {
  items: ProductListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
