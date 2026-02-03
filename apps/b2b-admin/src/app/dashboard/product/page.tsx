"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreateProductModal } from "@/components/form/CreateProductModal";
import { CreateSKUModal } from "@/components/form/CreateSKUModal";
import { EditSKUModal } from "@/components/form/EditSKUModal";
import { VariantMediaModal } from "@/components/form/VariantMediaModal";
import { HeaderToolbar } from "@/components/product/HeaderToolbar";
import { ProductList } from "@/components/product/ProductList";
import { Product } from "@/hooks/api/product.type";
import {
  useBatchDeleteSiteProduct,
  useDeleteSiteProduct,
  useSiteProductPageList,
} from "@/hooks/api/site-product";
import { useBatchDeleteSku, useDeleteSku } from "@/hooks/api/sku";
import { SkuListRes } from "@/hooks/api/sku.type";

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<"global" | "my">("my");
  const { data, isLoading, refetch } = useSiteProductPageList({
    page: 1,
    limit: 100,
    isListed: viewMode === "my",
  });
  const deleteSkuMutation = useDeleteSku();
  const batchDeleteSkuMutation = useBatchDeleteSku();
  const deleteProductMutation = useBatchDeleteSiteProduct();
  const deleteSingleProductMutation = useDeleteSiteProduct();

  // --- 2. 状态 ---
  const [searchTerm, setSearchTerm] = useState("");
  // 🔥 注意：selectedIds 存储的是 siteProductId，用于删除操作
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSkuIds, setSelectedSkuIds] = useState<Set<string>>(new Set());
  // expandedIds 存储的是物理 product.id，用于展开折叠
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 弹窗控制
  const [productModal, setProductModal] = useState<{
    open: boolean;
    data?: Product;
  }>({ open: false });
  const [skuCreateId, setSkuCreateId] = useState<string | null>(null);
  const [skuEditData, setSkuEditData] = useState<SkuListRes | null>(null);
  const [variantMediaData, setVariantMediaData] = useState<{
    productId: string;
    skus: SkuListRes[];
  } | null>(null);

  // --- 3. 逻辑处理 ---
  const filteredProducts =
    data?.data.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.spuCode.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // 切换选中
  const handleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    checked ? next.add(id) : next.delete(id);
    setSelectedIds(next);
  };

  // 切换展开
  const handleToggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedIds(next);
  };

  // 各种删除逻辑 (简化示例)
  const handleDeleteSku = async (id: string, code: string) => {
    if (!confirm(`确认删除 SKU ${code}?`)) return;
    await deleteSkuMutation.mutateAsync(id);
    toast.success("已删除");
    refetch();
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`确认删除商品 "${product.name}"?`)) return;
    // 🔥 使用 siteProductId 而不是 id 进行删除
    await deleteSingleProductMutation.mutateAsync(product.siteProductId);
    toast.success("商品已删除");
    refetch();
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确认删除 ${selectedIds.size} 个商品?`)) return;
    await deleteProductMutation.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    toast.success("批量删除成功");
    refetch();
  };

  // 批量删除 SKU
  const handleBatchDeleteSku = async () => {
    if (selectedSkuIds.size === 0) return;
    if (!confirm(`确认删除 ${selectedSkuIds.size} 个 SKU?`)) return;
    await batchDeleteSkuMutation.mutateAsync(Array.from(selectedSkuIds));
    setSelectedSkuIds(new Set());
    toast.success("批量删除 SKU 成功");
    refetch();
  };

  // 切换 SKU 选中
  const handleSelectSku = (id: string, checked: boolean) => {
    setSelectedSkuIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  // 批量切换 SKU 选中状态（用于全选/取消全选）
  const handleToggleAllSkus = (ids: string[], checked: boolean) => {
    setSelectedSkuIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        ids.forEach((id) => next.add(id));
      } else {
        ids.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  if (isLoading) return null;

  return (
    <>
      {/* SidebarInset 被 layout.tsx 替代，这里直接渲染内容 */}
      <div className="flex flex-col overflow-hidden bg-slate-50/50">
        {/* 模块 1: 头部与工具栏 */}
        <HeaderToolbar
          onAdd={() => setProductModal({ open: true })}
          onBatchDelete={handleBatchDelete}
          onSearchChange={setSearchTerm}
          onViewModeChange={setViewMode}
          searchTerm={searchTerm}
          // 集团站点隐藏"添加商品"按钮
          selectedCount={selectedIds.size}
          viewMode={viewMode}
        />

        {/* 模块 2: 滚动列表区域 */}
        <div className="flex-1 overflow-y-auto">
          <ProductList
            expandedIds={expandedIds}
            onBatchDeleteSku={handleBatchDeleteSku}
            onCreateSku={(id) => setSkuCreateId(id)}
            onDelete={handleDeleteProduct}
            onDeleteSku={handleDeleteSku}
            onEdit={(p) => setProductModal({ open: true, data: p })}
            onEditSku={(sku) => setSkuEditData(sku)}
            onManageVariantMedia={(productId, skus) =>
              setVariantMediaData({ productId, skus })
            }
            onSelect={handleSelect}
            onSelectSku={handleSelectSku}
            onToggleAllSkus={handleToggleAllSkus}
            onToggleExpand={handleToggleExpand}
            // SKU 批量选择和删除
            products={filteredProducts}
            selectedIds={selectedIds}
            selectedSkuIds={selectedSkuIds}
            viewMode={viewMode}
          />
        </div>

        {/* 模块 3 (隐式): 弹窗挂载 */}
        {/* 弹窗始终渲染，通过控制内部显示创建/编辑字段 */}
        <CreateProductModal
          onOpenChange={(open) =>
            setProductModal({
              open,
              data: open ? productModal.data : undefined,
            })
          }
          onSuccess={refetch}
          open={productModal.open}
          product={productModal.data}
        />
        <CreateSKUModal
          onOpenChange={() => setSkuCreateId(null)}
          onSuccess={refetch}
          open={!!skuCreateId}
          productId={skuCreateId || undefined}
        />
        <EditSKUModal
          onOpenChange={() => setSkuEditData(null)}
          onSuccess={refetch}
          open={!!skuEditData}
          sku={skuEditData || undefined}
        />
        <VariantMediaModal
          onOpenChange={() => setVariantMediaData(null)}
          onSuccess={refetch}
          open={!!variantMediaData}
          productId={variantMediaData?.productId || ""}
          skus={variantMediaData?.skus}
        />
      </div>
    </>
  );
}
