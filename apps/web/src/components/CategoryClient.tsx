"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ProductCard from "@/components/product/productCard";
import {
  useSiteCategoryDetail,
  useSiteCategoryProducts,
} from "@/hooks/api/site-category";
import type { SiteCategoryProductRes } from "@/hooks/api/site-category.type";

export default function CategoryClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();

  const [isMounted, setIsMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<SiteCategoryProductRes[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 12;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 查询分类详情
  const {
    data: categoryData,
    isLoading: isCategoryLoading,
    error: categoryError,
  } = useSiteCategoryDetail(id || "", { enabled: isMounted && !!id });

  // 查询分类下的产品列表
  const {
    data: products,
    isLoading: isProductLoading,
    error: productError,
  } = useSiteCategoryProducts(
    id || "",
    { page, limit },
    { enabled: isMounted && !!id }
  );

  // 当新数据加载完成时，更新商品列表
  useEffect(() => {
    if (products) {
      console.log("products loaded:", products.length, "page:", page);
      if (page === 1) {
        setAllProducts(products);
      } else {
        setAllProducts((prev) => [...prev, ...products]);
      }
      setIsLoadingMore(false);
    }
  }, [products, page]);

  // loading 状态聚合
  const isLoading =
    !isMounted || isCategoryLoading || (isProductLoading && page === 1);

  // error 状态聚合
  const isError = categoryError || productError || !(isLoading || categoryData);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, []);

  // 重置分页当分类ID改变时
  useEffect(() => {
    console.log("id changed:", id);
    setPage(1);
    setAllProducts([]);
    setIsLoadingMore(false);
    // 清除缓存，确保重新获取数据
    if (id) {
      queryClient.removeQueries({ queryKey: ["category-products"] });
      queryClient.removeQueries({ queryKey: ["category-detail"] });
    }
  }, [id, queryClient]);

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 font-serif text-3xl italic">
            Category Not Found
          </h1>
          <p className="text-gray-500">
            The category you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const title = categoryData?.name || "Collection";
  const description = categoryData?.description || "";
  const hasMore = allProducts.length >= limit;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="mt-12 mb-12 px-6 text-center">
        <h1 className="mb-4 font-serif text-4xl uppercase tracking-widest md:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto max-w-2xl font-serif text-gray-500 italic">
            {description}
          </p>
        )}
      </div>

      {/* Product Grid */}
      <div className="mx-auto max-w-400 px-6">
        {allProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-3 lg:grid-cols-4">
            {allProducts.map((product) => (
              <ProductCard
                key={`${product.id}-${page}`}
                product={{
                  siteProductId: product.id,
                  displayName: product.displayName,
                  displayDesc: product.displayDesc,
                  productId: product.id,
                  spuCode: product.spuCode,
                  minPrice: product.minPrice,
                  mainMedia: product.mainMedia,
                  isFeatured: product.isFeatured,
                  sortOrder: null,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <h3 className="mb-2 font-serif text-2xl italic">
              No products found
            </h3>
            <p className="text-gray-500 text-sm">
              This collection is currently being curated.
            </p>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && allProducts.length > 0 && (
          <div className="mt-20 flex justify-center">
            <button
              className="border-black border-b pb-1 font-bold text-xs uppercase tracking-[0.2em] transition-colors hover:border-gray-500 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoadingMore}
              onClick={handleLoadMore}
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
