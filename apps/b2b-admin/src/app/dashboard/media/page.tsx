"use client";

import {
  ChevronLeft,
  ChevronRight,
  FileIcon,
  Loader2,
  MoreHorizontal,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

import { Can } from "@/components/auth";
import { MediaUpload } from "@/components/MediaUpload";
import { Button } from "@/components/ui/button";
import { CategorySelect } from "@/components/ui/category-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageGallery } from "@/components/ui/image-gallery";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useBatchDeleteMedia, useMediaPageList } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { isImageFile, isVideoFile } from "@/utils/media";

export interface UseMediaList {
  id: string;
  createdAt: string;
  updatedAt: string;
  storageKey: string;
  category: string;
  url: string;
  originalName: string;
  mimeType: string;
  status: boolean;
  exporterId?: any;
  factoryId?: any;
  ownerId?: any;
  isPublic: boolean;
  siteId: string;
}

interface MediaListResponse {
  data: UseMediaList[];
  total: number;
  page: number;
  limit: number;
}

export default function MediaLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500); // 500ms 防抖
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // 1. 获取数据 (使用防抖后的搜索词)
  const { data, isLoading, error, refetch } = useMediaPageList({
    page,
    limit: 30,
    category: category || undefined,
    search: debouncedSearch || undefined,
  });

  const response = data as MediaListResponse | undefined;
  const mediaItems = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / 10);

  const deleteMediaMutation = useBatchDeleteMedia();

  // 2. 处理删除逻辑
  const handleDelete = async (ids: string[]) => {
    if (!window.confirm(`确定要删除选中的 ${ids.length} 个文件吗？`)) return;

    // 使用 mutate 而不是 mutateAsync，让全局 QueryProvider 处理错误
    deleteMediaMutation.mutate(ids, {
      onSuccess: () => {
        toast.success("删除成功");
        setSelectedItems([]);
        refetch();
      },
    });
  };

  // 3. 全选逻辑
  const handleSelectAll = () => {
    if (selectedItems.length === mediaItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mediaItems.map((item: any) => item.id));
    }
  };

  // 4. 处理页码变化
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    setSelectedItems([]); // 切换页面时清空选中
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator className="mr-2 h-4" orientation="vertical" />
          <nav className="font-medium text-sm">Media Library</nav>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* 标题与操作区 */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-bold text-2xl text-slate-900 tracking-tight">
              媒体库
            </h1>
            <p className="text-slate-500 text-sm">
              管理站点范围内的所有数字资产
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedItems.length > 0 && (
              <Can permission="MEDIA_DELETE">
                <Button
                  disabled={deleteMediaMutation.isPending}
                  onClick={() => handleDelete(selectedItems)}
                  variant="destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  批量删除 ({selectedItems.length})
                </Button>
              </Can>
            )}

            <MediaUpload onUploadComplete={() => refetch()}>
              <Button className="bg-indigo-600 shadow-sm transition-all hover:bg-indigo-700 active:scale-95">
                <Upload className="mr-2 size-4" />
                上传文件
              </Button>
            </MediaUpload>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm sm:flex-row">
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pr-4 pl-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索文件名..."
                value={searchTerm}
              />
            </div>
            {searchTerm && (
              <button
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setSearchTerm("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="w-64">
            <CategorySelect
              allowClear={true}
              onChange={setCategory}
              placeholder="筛选分类..."
              value={category}
            />
          </div>
        </div>

        {/* 全选控制条 */}
        {mediaItems.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-600 text-sm">
              <input
                checked={
                  selectedItems.length === mediaItems.length &&
                  mediaItems.length > 0
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                onChange={handleSelectAll}
                type="checkbox"
              />
              全选 ({selectedItems.length} / {mediaItems.length})
            </label>
          </div>
        )}

        {/* 媒体网格展示层 */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-indigo-600" />
              <p className="mt-4 text-slate-500 text-sm">正在检索媒体文件...</p>
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-slate-200 border-dashed bg-slate-50 py-20">
              <div className="rounded-full bg-white p-4 shadow-sm">
                <FileIcon className="size-8 text-slate-400" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">未找到文件</h3>
              <p className="text-slate-500 text-sm">
                尝试更换搜索词或上传新文件
              </p>
            </div>
          ) : (
            mediaItems.map((asset: UseMediaList) => (
              <MediaCard
                asset={asset}
                isSelected={selectedItems.includes(asset.id)}
                key={asset.id}
                onDelete={() => handleDelete([asset.id])}
                onSelect={() => {
                  setSelectedItems((prev) =>
                    prev.includes(asset.id)
                      ? prev.filter((i) => i !== asset.id)
                      : [...prev, asset.id]
                  );
                }}
              />
            ))
          )}
        </div>

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-slate-600 text-sm">
              共 {total} 个文件，第 {page} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={page === 1 || isLoading}
                onClick={() => handlePageChange(page - 1)}
                size="sm"
                variant="outline"
              >
                <ChevronLeft className="mr-1 size-4" />
                上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      className={cn(
                        "size-10 p-0",
                        page === pageNum
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-white"
                      )}
                      disabled={isLoading}
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      size="sm"
                      variant={page === pageNum ? "default" : "outline"}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                disabled={page === totalPages || isLoading}
                onClick={() => handlePageChange(page + 1)}
                size="sm"
                variant="outline"
              >
                下一页
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// --- 抽离出的媒体卡片子组件 ---
function MediaCard({
  asset,
  isSelected,
  onSelect,
  onDelete,
}: {
  asset: UseMediaList;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const isImage = isImageFile(asset.url);
  const isVideo = isVideoFile(asset.url);

  const handleMouseEnter = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.play().catch(() => {
      // 静默处理自动播放被阻止的情况
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-all hover:shadow-lg",
        isSelected
          ? "border-indigo-600 ring-2 ring-indigo-600/20"
          : "border-slate-200"
      )}
    >
      {/* 选中勾选框 (始终可见或悬浮可见) */}
      <div
        className={cn(
          "absolute top-3 left-3 z-20 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <input
          checked={isSelected}
          className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          onChange={onSelect}
          type="checkbox"
        />
      </div>

      {/* 预览区 */}
      <div className="relative aspect-square w-full bg-slate-100">
        {isImage ? (
          <div className="absolute inset-0">
            <ImageGallery
              autoSingleMode={true}
              images={[
                {
                  id: asset.id,
                  url: asset.url,
                  isMain: false,
                  originalName: asset.originalName,
                },
              ]}
              size="fill"
            />
          </div>
        ) : isVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            muted
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            playsInline
            src={asset.url}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <FileIcon className="size-10 text-slate-400" />
            <span className="font-bold text-[10px] text-slate-400 uppercase">
              {asset.url?.split(".").pop()?.toLowerCase() ?? ""}
            </span>
          </div>
        )}

        {/* 悬浮操作按钮 */}
        <div className="absolute top-2 right-2 z-20 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="size-8 shadow-sm"
                size="icon"
                variant="secondary"
              >
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => window.open(asset.url, "_blank")}
              >
                打开文件
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(asset.url);
                  toast.success("链接已复制");
                }}
              >
                复制链接
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Can permission="MEDIA_DELETE">
                <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                  删除
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 信息区 */}
      <div className="p-2">
        <p
          className="truncate font-medium text-[11px] text-slate-900"
          title={asset.originalName}
        >
          {asset.originalName}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-slate-400">
          <span>{asset.mimeType?.split("/")[0].toUpperCase()}</span>
          {asset.category && (
            <>
              <span>·</span>
              <Tag className="text-slate-400" size={8} />
              <span className="truncate">{asset.category}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
