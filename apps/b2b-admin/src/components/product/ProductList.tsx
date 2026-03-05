// components/product/product-list.tsx
"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Can, SiteBoundary } from "@/components/auth/Can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageGallery } from "@/components/ui/image-gallery";
import { Product } from "@/hooks/api/product.type";
import { useBatchUpdateSortOrder } from "@/hooks/api/site-product";
import { SkuListRes } from "@/hooks/api/sku.type";
import { cn } from "@/lib/utils";
import { SkuPanel } from "./SkuPanel";

interface ProductListProps {
  products: Product[];
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  viewMode: "global" | "my";
  onSelect: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  // 操作回调
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onCreateSku: (id: string) => void;
  onEditSku: (sku: SkuListRes) => void;
  onDeleteSku: (id: string, code: string) => void;
  onManageVariantMedia?: (productId: string, skus: SkuListRes[]) => void;
  // SKU 批量选择和删除
  selectedSkuIds: Set<string>;
  onSelectSku: (id: string, checked: boolean) => void;
  onToggleAllSkus: (ids: string[], checked: boolean) => void;
  onBatchDeleteSku: () => void;
  // 排序更新回调
  onProductsChange?: (products: Product[]) => void;
}

// 可排序的商品项组件 - 使用 memo 优化性能
interface SortableProductItemProps {
  product: Product;
  isExpanded: boolean;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onCreateSku: (id: string) => void;
  onEditSku: (sku: SkuListRes) => void;
  onDeleteSku: (id: string, code: string) => void;
  onManageVariantMedia?: (productId: string, skus: SkuListRes[]) => void;
  selectedSkuIds: Set<string>;
  onSelectSku: (id: string, checked: boolean) => void;
  onToggleAllSkus: (ids: string[], checked: boolean) => void;
  onBatchDeleteSku: () => void;
  viewMode: "global" | "my";
}

const SortableProductItem = memo(function SortableProductItem({
  product,
  isExpanded,
  isSelected,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  onCreateSku,
  onEditSku,
  onDeleteSku,
  onManageVariantMedia,
  selectedSkuIds,
  onSelectSku,
  onToggleAllSkus,
  onBatchDeleteSku,
  viewMode,
}: SortableProductItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.siteProductId });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition]
  );

  // 🔥 拖拽时只渲染占位符，不渲染复杂子组件
  if (isDragging) {
    return (
      <div
        className="h-24 w-full rounded-lg border-2 border-indigo-200 border-dashed bg-indigo-50/50"
        ref={setNodeRef}
        style={style}
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible
        className={cn(
          "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all",
          isSelected && "border-indigo-500 ring-1 ring-indigo-500"
        )}
        onOpenChange={() => onToggleExpand(product.id)}
        open={isExpanded}
      >
        <div className="flex items-center gap-4 p-4">
          {/* 拖拽手柄 */}
          <button
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <Checkbox
            checked={isSelected}
            onCheckedChange={(c) => onSelect(product.siteProductId, !!c)}
          />

          {product.mainImage ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
              <ImageGallery
                images={[
                  {
                    id: product.mainImageId || product.id,
                    url: product.mainImage,
                    isMain: true,
                    originalName: product.name,
                  },
                ]}
                size="md"
              />
            </div>
          ) : (
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-slate-100 text-muted-foreground text-xs">
              No Img
            </div>
          )}

          <div className="flex flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate font-semibold leading-none">
                {product.name}
              </h3>
              <Badge
                className="h-5 shrink-0 px-1.5 text-[10px]"
                variant={product.status === 1 ? "default" : "secondary"}
              >
                {product.status === 1 ? "发布" : "草稿"}
              </Badge>
            </div>
            <div className="flex items-center gap-8 text-muted-foreground text-sm sm:gap-4">
              <span className="truncate">编码: {product.spuCode}</span>
              <span className="shrink-0">SKU: {product.skuCount}</span>
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <div className="font-medium">¥{product.sitePrice || "0.00"}</div>
          </div>

          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button className="h-8 gap-1 text-xs" size="sm" variant="ghost">
                {isExpanded ? "收起" : "展开 SKU"}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-8 w-8" size="icon" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  编辑商品
                </DropdownMenuItem>

                <SiteBoundary only={["factory"]}>
                  <Can permission="SKU_CREATE">
                    <DropdownMenuItem onClick={() => onCreateSku(product.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      添加 SKU
                    </DropdownMenuItem>
                  </Can>
                </SiteBoundary>
                {/* 工厂模式：物理删除（无论在哪都显示） */}
                <SiteBoundary only={["factory"]}>
                  <Can permission="PRODUCT_DELETE">
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => onDelete(product)}
                    >
                      物理删除 (危险)
                    </DropdownMenuItem>
                  </Can>
                </SiteBoundary>
                {/* 商品池模式 + 集团站：显示"上架到本站" */}
                {viewMode === "global" && (
                  <SiteBoundary only={["group"]}>
                    <DropdownMenuItem
                      className="text-indigo-600"
                      onClick={() => onEdit(product)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      上架到本站
                    </DropdownMenuItem>
                  </SiteBoundary>
                )}
                {/* 我的商品模式 + 集团站：显示"从本站移除" */}
                {viewMode === "my" && (
                  <SiteBoundary only={["group"]}>
                    <DropdownMenuItem
                      className="text-orange-600"
                      onClick={() => onDelete(product)}
                    >
                      从本站移除
                    </DropdownMenuItem>
                  </SiteBoundary>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CollapsibleContent>
          <SkuPanel
            onBatchDeleteSku={onBatchDeleteSku}
            onDelete={onDeleteSku}
            onEdit={onEditSku}
            onManageVariantMedia={
              onManageVariantMedia
                ? () => onManageVariantMedia(product.id, product.skus)
                : undefined
            }
            onSelectSku={onSelectSku}
            onToggleAllSkus={onToggleAllSkus}
            productId={product.id}
            selectedSkuIds={selectedSkuIds}
            skus={product.skus}
            viewMode={viewMode}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

export function ProductList({
  products,
  selectedIds,
  expandedIds,
  viewMode,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  onCreateSku,
  onEditSku,
  onDeleteSku,
  onManageVariantMedia,
  selectedSkuIds,
  onSelectSku,
  onToggleAllSkus,
  onBatchDeleteSku,
  onProductsChange,
}: ProductListProps) {
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [activeId, setActiveId] = useState<string | null>(null);
  const batchUpdateSortOrder = useBatchUpdateSortOrder();

  // 当外部 products 变化时同步到本地状态
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 只有拖动8px后才激活，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = localProducts.findIndex(
          (p) => p.siteProductId === active.id
        );
        const newIndex = localProducts.findIndex(
          (p) => p.siteProductId === over.id
        );

        const newProducts = arrayMove(localProducts, oldIndex, newIndex);
        setLocalProducts(newProducts);

        // 通知父组件更新
        onProductsChange?.(newProducts);

        // 🔥 优化：只更新受影响的商品，而不是全部商品
        const affectedItems = [];
        const startIndex = Math.min(oldIndex, newIndex);
        const endIndex = Math.max(oldIndex, newIndex);

        for (let i = startIndex; i <= endIndex; i++) {
          affectedItems.push({
            siteProductId: newProducts[i].siteProductId,
            sortOrder: i,
          });
        }

        try {
          await batchUpdateSortOrder.mutateAsync({ items: affectedItems });
          toast.success("排序已更新");
        } catch (error) {
          toast.error("排序更新失败");
          // 恢复原顺序
          setLocalProducts(products);
          onProductsChange?.(products);
        }
      }
    },
    [localProducts, products, onProductsChange, batchUpdateSortOrder]
  );

  // 拖拽时显示的预览组件
  const activeProduct = useMemo(
    () => localProducts.find((p) => p.siteProductId === activeId),
    [localProducts, activeId]
  );

  const DragOverlayContent = useMemo(() => {
    if (!activeProduct) return null;
    return (
      <div className="flex items-center gap-4 rounded-lg border bg-card p-4 opacity-50 shadow-lg">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <div className="font-semibold">{activeProduct.name}</div>
          <div className="text-muted-foreground text-sm">
            {activeProduct.spuCode}
          </div>
        </div>
      </div>
    );
  }, [activeProduct]);

  // 🔥 过滤掉没有 siteProductId 的商品（商品池中的商品）
  const sortableProducts = useMemo(
    () => localProducts.filter((p) => p.siteProductId),
    [localProducts]
  );
  const nonSortableProducts = useMemo(
    () => localProducts.filter((p) => !p.siteProductId),
    [localProducts]
  );

  if (localProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-slate-100 p-4">
          <p className="font-semibold">暂无商品</p>
          <p className="text-muted-foreground text-sm">
            点击右上角按钮开始创建。
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 可拖拽的商品列表 */}
      {sortableProducts.length > 0 && (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <SortableContext
            items={sortableProducts.map((p) => p.siteProductId!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4 p-4">
              {sortableProducts.map((product) => {
                const isExpanded = expandedIds.has(product.id);
                const isSelected = selectedIds.has(product.siteProductId);

                return (
                  <SortableProductItem
                    isExpanded={isExpanded}
                    isSelected={isSelected}
                    key={product.siteProductId}
                    onBatchDeleteSku={onBatchDeleteSku}
                    onCreateSku={onCreateSku}
                    onDelete={onDelete}
                    onDeleteSku={onDeleteSku}
                    onEdit={onEdit}
                    onEditSku={onEditSku}
                    onManageVariantMedia={onManageVariantMedia}
                    onSelect={onSelect}
                    onSelectSku={onSelectSku}
                    onToggleAllSkus={onToggleAllSkus}
                    onToggleExpand={onToggleExpand}
                    product={product}
                    selectedSkuIds={selectedSkuIds}
                    viewMode={viewMode}
                  />
                );
              })}
            </div>
          </SortableContext>
          <DragOverlay>{DragOverlayContent}</DragOverlay>
        </DndContext>
      )}

      {/* 不可拖拽的商品池商品 - 保留完整功能，只是不支持拖拽 */}
      {nonSortableProducts.length > 0 && (
        <div className="space-y-4 p-4">
          {nonSortableProducts.map((product) => {
            const isExpanded = expandedIds.has(product.id);
            const isSelected = selectedIds.has(product.siteProductId);

            return (
              <Collapsible
                className={cn(
                  "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
                  isSelected && "border-indigo-500 ring-1 ring-indigo-500"
                )}
                key={product.id}
                onOpenChange={() => onToggleExpand(product.id)}
                open={isExpanded}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* 无拖拽手柄，显示占位 */}
                  <div className="h-5 w-8" />

                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(c) =>
                      onSelect(product.siteProductId, !!c)
                    }
                  />

                  {product.mainImage ? (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
                      <ImageGallery
                        images={[
                          {
                            id: product.mainImageId || product.id,
                            url: product.mainImage,
                            isMain: true,
                            originalName: product.name,
                          },
                        ]}
                        size="md"
                      />
                    </div>
                  ) : (
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-slate-100 text-muted-foreground text-xs">
                      No Img
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate font-semibold leading-none">
                        {product.name}
                      </h3>
                      <Badge
                        className="h-5 shrink-0 px-1.5 text-[10px]"
                        variant={product.status === 1 ? "default" : "secondary"}
                      >
                        {product.status === 1 ? "发布" : "草稿"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-8 text-muted-foreground text-sm sm:gap-4">
                      <span className="truncate">编码: {product.spuCode}</span>
                      <span className="shrink-0">SKU: {product.skuCount}</span>
                    </div>
                  </div>

                  <div className="hidden text-right sm:block">
                    <div className="font-medium">
                      ¥{product.sitePrice || "0.00"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button
                        className="h-8 gap-1 text-xs"
                        size="sm"
                        variant="ghost"
                      >
                        {isExpanded ? "收起" : "展开 SKU"}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <SiteBoundary only={["factory"]}>
                          <DropdownMenuItem onClick={() => onEdit(product)}>
                            编辑商品
                          </DropdownMenuItem>
                        </SiteBoundary>

                        <SiteBoundary only={["factory"]}>
                          <Can permission="SKU_CREATE">
                            <DropdownMenuItem
                              onClick={() => onCreateSku(product.id)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              添加 SKU
                            </DropdownMenuItem>
                          </Can>
                        </SiteBoundary>
                        {/* 工厂模式：物理删除（无论在哪都显示） */}
                        <SiteBoundary only={["factory"]}>
                          <Can permission="PRODUCT_DELETE">
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onDelete(product)}
                            >
                              物理删除 (危险)
                            </DropdownMenuItem>
                          </Can>
                        </SiteBoundary>
                        {/* 商品池模式 + 集团站：显示"上架到本站" */}
                        {viewMode === "global" && (
                          <SiteBoundary only={["group"]}>
                            <DropdownMenuItem
                              className="text-indigo-600"
                              onClick={() => onEdit(product)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              上架到本站
                            </DropdownMenuItem>
                          </SiteBoundary>
                        )}
                        {/* 我的商品模式 + 集团站：显示"从本站移除" */}
                        {viewMode === "my" && (
                          <SiteBoundary only={["group"]}>
                            <DropdownMenuItem
                              className="text-orange-600"
                              onClick={() => onDelete(product)}
                            >
                              从本站移除
                            </DropdownMenuItem>
                          </SiteBoundary>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <CollapsibleContent>
                  <SkuPanel
                    onBatchDeleteSku={onBatchDeleteSku}
                    onDelete={onDeleteSku}
                    onEdit={onEditSku}
                    onManageVariantMedia={
                      onManageVariantMedia
                        ? () => onManageVariantMedia(product.id, product.skus)
                        : undefined
                    }
                    onSelectSku={onSelectSku}
                    onToggleAllSkus={onToggleAllSkus}
                    productId={product.id}
                    selectedSkuIds={selectedSkuIds}
                    skus={product.skus}
                    viewMode={viewMode}
                  />
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </>
  );
}
