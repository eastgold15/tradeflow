"use client";

import {
  Film,
  File as IconFile,
  Image as IconImage,
  Music,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { Progress } from "./progress";

interface UploadFile {
  id: string;
  file: File;
  originalName: string; // 原始文件名
  name: string; // 可编辑的显示名称
  size: number;
  type: string;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface UploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  maxFiles?: number;
  onUpload?: (files: File[]) => Promise<void>;
  onSuccess?: (files: UploadFile[]) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  autoUpload?: boolean; // 是否自动上传
  batchMode?: boolean; // 是否批量上传模式（一次性上传所有文件）
}

type FilePropertyBag = {
  type?: string;
  lastModified?: number;
};

export function Upload({
  accept = "image/*,video/*,.pdf,.doc,.docx",
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 20,
  onUpload,
  onSuccess,
  onError,
  className,
  disabled = false,
  autoUpload = false,
  batchMode = false,
}: UploadProps) {
  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <IconImage className="size-4" />;
    if (type.startsWith("video/")) return <Film className="size-4" />;
    if (type.startsWith("audio/")) return <Music className="size-4" />;
    return <IconFile className="size-4" />;
  };

  const createPreview = (file: File): Promise<string> =>
    new Promise((resolve) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve("");
      }
    });

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `文件大小超过限制 (${formatFileSize(maxSize)})`;
    }
    return null;
  };

  const addFiles = async (newFiles: FileList | File[]) => {
    const fileList = Array.from(newFiles);

    if (files.length + fileList.length > maxFiles) {
      onError?.(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    const newUploadFiles: UploadFile[] = [];

    for (const file of fileList) {
      const error = validateFile(file);
      if (error) {
        onError?.(`${file.name}: ${error}`);
        continue;
      }

      const preview = await createPreview(file);
      newUploadFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        originalName: file.name, // 保存原始文件名
        name: file.name, // 可编辑的显示名
        size: file.size,
        type: file.type,
        preview,
        progress: 0,
        status: "pending",
      });
    }

    setFiles((prev) => [...prev, ...newUploadFiles]);

    // 自动上传模式：添加文件后自动开始上传
    if (autoUpload && newUploadFiles.length > 0) {
      // 使用 setTimeout 确保状态更新后再触发上传
      setTimeout(() => {
        handleUpload();
      }, 100);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0 || !onUpload) return;

    // 标记所有待上传文件为上传中状态
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending"
          ? { ...f, status: "uploading" as const, progress: 0 }
          : f
      )
    );

    try {
      // 准备所有要上传的文件
      const uploadFiles = pendingFiles.map((uploadFile) => {
        // 创建新的 File 对象，使用编辑后的名称（如果名称被修改了）
        const fileToUpload =
          uploadFile.name !== uploadFile.originalName
            ? new File([uploadFile.file], uploadFile.name, {
              type: uploadFile.file.type,
              lastModified: uploadFile.file.lastModified,
            } as FilePropertyBag)
            : uploadFile.file;

        return { fileToUpload, uploadFile };
      });

      if (batchMode) {
        // 批量上传模式：一次性上传所有文件
        try {
          // 更新所有文件进度到 50%
          setFiles((prev) =>
            prev.map((f) =>
              f.status === "uploading" ? { ...f, progress: 50 } : f
            )
          );

          // 一次性上传所有文件
          const allFiles = uploadFiles.map((f) => f.fileToUpload);
          await onUpload(allFiles);

          // 标记所有为成功
          setFiles((prev) =>
            prev.map((f) =>
              f.status === "uploading"
                ? { ...f, status: "success" as const, progress: 100 }
                : f
            )
          );

          const successfulFiles = files.filter((f) => f.status === "success");
          if (successfulFiles.length > 0) {
            onSuccess?.(successfulFiles);
          }

          // 清理已上传的文件
          setTimeout(() => {
            setFiles((prev) => prev.filter((f) => f.status !== "success"));
          }, 2000);
        } catch (error) {
          // 批量上传失败，所有文件标记为错误
          setFiles((prev) =>
            prev.map((f) =>
              f.status === "uploading"
                ? { ...f, status: "error" as const, error: "上传失败" }
                : f
            )
          );
          onError?.("批量上传失败，请重试");
        }
      } else {
        // 逐个上传模式（原有逻辑）
        for (const { fileToUpload, uploadFile } of uploadFiles) {
          try {
            // 更新进度
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress: 50 } : f
              )
            );

            // 调用上传回调
            await onUpload([fileToUpload]);

            // 标记为成功
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? { ...f, status: "success" as const, progress: 100 }
                  : f
              )
            );
          } catch (error) {
            // 单个文件失败，标记为错误但继续处理其他文件
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? { ...f, status: "error" as const, error: "上传失败" }
                  : f
              )
            );
          }
        }

        // 检查是否有成功的文件
        const successfulFiles = files.filter((f) => f.status === "success");
        if (successfulFiles.length > 0) {
          onSuccess?.(successfulFiles);
        }

        // 检查是否所有文件都失败了
        const failedFiles = files.filter((f) => f.status === "error");
        if (failedFiles.length === pendingFiles.length) {
          onError?.("所有文件上传失败，请重试");
        } else if (failedFiles.length > 0) {
          onError?.(`${failedFiles.length} 个文件上传失败`);
        }

        // 清理已上传的文件
        setTimeout(() => {
          setFiles((prev) => prev.filter((f) => f.status !== "success"));
        }, 2000);
      }
    } catch (error) {
      // 整体上传失败
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading"
            ? { ...f, status: "error" as const, error: "上传失败" }
            : f
        )
      );
      onError?.("上传失败，请重试");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  const hasPendingFiles = files.some((f) => f.status === "pending");

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          "border-2 border-dashed transition-colors",
          isDragOver && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <UploadIcon className="mb-4 size-10 text-muted-foreground" />
          <div className="mb-2 space-y-1">
            <p className="font-medium text-sm">拖拽文件到此处上传</p>
            <p className="text-muted-foreground text-xs">
              或者点击下方按钮选择文件
            </p>
          </div>
          <p className="mb-4 text-muted-foreground text-xs">
            支持格式: {accept} | 最大大小: {formatFileSize(maxSize)} | 最多{" "}
            {maxFiles} 个文件
          </p>
          <Button
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            选择文件
          </Button>
          <input
            accept={accept}
            className="hidden"
            disabled={disabled}
            multiple={multiple}
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {!autoUpload && (
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                待上传文件 ({files.length})
              </h4>
              {hasPendingFiles && (
                <Button disabled={disabled} onClick={handleUpload} size="sm">
                  开始上传
                </Button>
              )}
            </div>
          )}
          {autoUpload && (
            <h4 className="font-medium text-sm">
              正在上传文件 ({files.filter((f) => f.status === "pending").length}
              )
            </h4>
          )}

          <div className="space-y-2">
            {files.map((uploadFile) => (
              <Card className="p-3" key={uploadFile.id}>
                <div className="flex items-start gap-3">
                  {uploadFile.preview ? (
                    <img
                      alt={uploadFile.name}
                      className="mt-0.5 size-10 rounded object-cover"
                      src={uploadFile.preview}
                    />
                  ) : (
                    <div className="mt-0.5 flex size-10 items-center justify-center rounded-md bg-muted">
                      {getFileIcon(uploadFile.type)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      {/* 文件名编辑区域 */}
                      <div className="min-w-0 flex-1">
                        {uploadFile.status !== "uploading" ? (
                          <input
                            className="w-full truncate rounded border border-transparent bg-transparent px-2 py-1 font-medium text-sm transition-colors hover:border-gray-200 focus:border-primary focus:outline-none"
                            disabled={uploadFile.status === "pending"}
                            onChange={(e) => {
                              setFiles((prev) =>
                                prev.map((f) =>
                                  f.id === uploadFile.id
                                    ? { ...f, name: e.target.value }
                                    : f
                                )
                              );
                            }}
                            type="text"
                            value={uploadFile.name}
                          />
                        ) : (
                          <p className="truncate font-medium text-sm">
                            {uploadFile.name}
                          </p>
                        )}
                        {uploadFile.name !== uploadFile.originalName && (
                          <p className="mt-0.5 text-muted-foreground text-xs">
                            原始名称: {uploadFile.originalName}
                          </p>
                        )}
                      </div>

                      {/* 删除按钮 */}
                      <Button
                        className="h-6 w-6 flex-shrink-0"
                        disabled={uploadFile.status === "uploading"}
                        onClick={() => removeFile(uploadFile.id)}
                        size="icon"
                        variant="ghost"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>

                    {/* 文件信息 */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {formatFileSize(uploadFile.size)}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          uploadFile.status === "success" && "text-green-600",
                          uploadFile.status === "error" && "text-red-600",
                          uploadFile.status === "uploading" && "text-blue-600"
                        )}
                      >
                        {uploadFile.status === "pending" && "等待上传"}
                        {uploadFile.status === "uploading" &&
                          `上传中... ${uploadFile.progress}%`}
                        {uploadFile.status === "success" && "上传成功"}
                        {uploadFile.status === "error" &&
                          (uploadFile.error || "上传失败")}
                      </span>
                    </div>

                    {/* 上传进度条 */}
                    {uploadFile.status === "uploading" && (
                      <Progress
                        className="mt-2 h-1"
                        value={uploadFile.progress}
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
