import { Plus, Video } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { MediaSelectorDialog } from "@/components/MediaSelectorDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaList } from "@/hooks/api";
import { isVideoFile } from "@/utils/media";

interface MediaSelectProps {
  value?: string[]; // 媒体ID列表
  onChange?: (mediaIds: string[]) => void; // 回调函数
  maxCount?: number; // 最大选择数量
  max?: number; // maxCount 的别名（向后兼容）
  className?: string;
  placeholder?: string;
  multiple?: boolean;
  category?: string; // 媒体分类筛选
  availableMediaIds?: string[]; // 可选择的媒体ID列表（用于主图从已选图片中选择）
}

export function MediaSelect({
  value = [],
  onChange,
  maxCount = 10,
  max,
  className,
  placeholder = "选择图片",
  multiple = true,
  category = "",
  availableMediaIds,
}: MediaSelectProps) {
  // 优先使用 maxCount，如果没有则使用 max（向后兼容）
  const effectiveMaxCount = maxCount ?? max ?? 5;
  const [dialogOpen, setDialogOpen] = useState(false);

  // 获取媒体列表（用于显示已选择的媒体）
  const { data: mediaListData } = useMediaList({
    category,
    search: "",
  });
  const mediaList = mediaListData || [];

  // 确认选择媒体
  const handleSelectMedia = (mediaIds: string[]) => {
    onChange?.(mediaIds);
  };

  // 移除媒体
  const handleRemoveMedia = (mediaId: string) => {
    const newMediaIds = value.filter((id) => id !== mediaId);
    onChange?.(newMediaIds);
  };

  // 获取媒体信息
  const getMedia = (mediaId: string) => mediaList.find((m) => m.id === mediaId);

  // 视频悬停播放处理
  const handleMouseEnter = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.play().catch((err) => console.error("视频播放错误:", err));
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <div className={className}>
      <TooltipProvider>
        <div className="space-y-2">
          {/* 显示已选择的媒体 */}
          {value.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {value.map((mediaId) => {
                const media = getMedia(mediaId);
                const video = isVideoFile(media?.url);

                return (
                  <Tooltip key={mediaId}>
                    <TooltipTrigger asChild>
                      <Card className="relative cursor-pointer">
                        <CardContent className="p-2">
                          <div className="group relative aspect-square overflow-hidden rounded-md bg-muted">
                            {video ? (
                              <video
                                className="h-full w-full object-cover"
                                muted
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                                playsInline
                                src={media?.url}
                              />
                            ) : (
                              <Image
                                alt={media?.originalName || "媒体"}
                                className="h-full w-full object-cover"
                                fill
                                sizes="(max-width: 768px) 50vw, 20vw"
                                src={media?.url || "/placeholder.png"}
                              />
                            )}
                            {/* 删除按钮 */}
                            <Button
                              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 p-0 opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMedia(mediaId);
                              }}
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              ×
                            </Button>
                            {/* 视频标记 */}
                            {video && (
                              <div className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50">
                                <Video className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs break-all">
                        {media?.originalName}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* 添加媒体按钮 */}
          {(!multiple && value.length === 0) ||
            (multiple && value.length < effectiveMaxCount) ? (
            <Button
              className="w-full"
              onClick={() => setDialogOpen(true)}
              type="button"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              {placeholder}
            </Button>
          ) : null}

          {/* 媒体选择对话框 */}
          <MediaSelectorDialog
            availableMediaIds={availableMediaIds}
            category={category}
            initialSelected={value}
            maxCount={effectiveMaxCount}
            multiple={multiple}
            onOpenChange={setDialogOpen}
            onSelect={handleSelectMedia}
            open={dialogOpen}
          />
        </div>
      </TooltipProvider>
    </div>
  );
}
