"use client";

import type { SiteConfigContract } from "@repo/contract";
import { getConfigKeyLabel } from "@repo/contract";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Has } from "@/components/auth";
import { CreateSiteConfigModal } from "@/components/form/CreateSiteConfigModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSiteList } from "@/hooks/api/site";
import {
  useDeleteSiteConfig,
  useSiteConfigList,
} from "@/hooks/api/site-config";
import { DeepNonNullable } from "@/types/utils";

export default function SiteConfigPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<
    DeepNonNullable<SiteConfigContract["Response"]> | undefined
  >();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");

  // 获取站点配置列表
  const { data: configListData, isLoading, refetch } = useSiteConfigList();

  // 获取站点列表（用于显示站点名称）
  const { data: siteListData } = useSiteList({ limit: 100, page: 0 });

  // 删除站点配置
  const deleteMutation = useDeleteSiteConfig();

  // 创建站点 ID 到站点名称的映射
  const siteNameMap = (siteListData || []).reduce(
    (acc: Record<string, string>, site: any) => {
      acc[site.id] = site.name;
      return acc;
    },
    {} as Record<string, string>
  );

  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("站点配置删除成功");
      refetch();
    } catch (error) {
      console.error("删除失败:", error);
      toast.error("删除失败");
    }
  };

  // 处理编辑
  const handleEdit = (
    config: DeepNonNullable<SiteConfigContract["Response"]>
  ) => {
    setEditingConfig(config);
  };

  // 处理创建/编辑成功
  const handleSuccess = () => {
    refetch();
  };

  // 过滤配置项
  const filteredConfigs = (configListData || []).filter((config: any) => {
    const matchesSearch =
      config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (config.description?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      );

    const matchesSite =
      selectedSiteId === "all" || config.siteId === selectedSiteId;

    return matchesSearch && matchesSite;
  });

  // 获取所有站点 ID（包括 "all" 选项）
  const siteIds: string[] = Array.from(
    new Set<string>([
      "all",
      ...(configListData || []).map((config: any) => config.siteId),
    ])
  );

  // 按 siteId 分组
  const groupedConfigs = filteredConfigs.reduce(
    (acc: Record<string, typeof filteredConfigs>, config: any) => {
      const siteId = config.siteId;
      if (!acc[siteId]) {
        acc[siteId] = [];
      }
      acc[siteId].push(config);
      return acc;
    },
    {} as Record<string, typeof filteredConfigs>
  );

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator className="mr-2 h-4" orientation="vertical" />
          <nav className="font-medium text-sm">Site Configuration</nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-6">
          {/* 页面标题和操作栏 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-3xl">站点配置管理</h1>
              <p className="text-muted-foreground">
                管理站点的各种配置项，支持多语言和分类管理
              </p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建配置
            </Button>
          </div>

          {/* 搜索和筛选 */}
          <Card>
            <CardHeader>
              <CardTitle>搜索与筛选</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索配置类型、内容或描述..."
                    value={searchTerm}
                  />
                </div>
                <div className="flex gap-2">
                  {siteIds.map((siteId) => (
                    <Button
                      key={siteId}
                      onClick={() => setSelectedSiteId(siteId)}
                      variant={
                        selectedSiteId === siteId ? "default" : "outline"
                      }
                    >
                      {siteId === "all"
                        ? "全部站点"
                        : siteNameMap[siteId] || siteId}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 配置列表 */}
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center">加载中...</CardContent>
            </Card>
          ) : Object.keys(groupedConfigs).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchTerm || selectedSiteId !== "all"
                  ? "未找到匹配的配置项"
                  : "暂无站点配置，点击上方按钮创建"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedConfigs).map(
                ([siteId, configs]) =>
                  configs.length > 0 && (
                    <Card key={siteId}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{siteNameMap[siteId] || siteId}</span>
                          <Badge variant="secondary">{configs.length} 项</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {configs.map((config: any) => (
                            <div
                              className="rounded-lg border p-4 hover:bg-muted/50"
                              key={config.id}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">
                                      {config.label ||
                                        getConfigKeyLabel(config.key)}
                                    </h3>
                                    <div className="flex gap-1">
                                      {config.translatable && (
                                        <Badge variant="outline">可翻译</Badge>
                                      )}
                                      {config.visible && (
                                        <Badge variant="outline">
                                          前端可见
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <p className="mt-1 text-muted-foreground text-xs">
                                    配置类型: {config.key}
                                  </p>

                                  <div className="mt-2 text-sm">
                                    <span className="font-medium">
                                      配置内容:
                                    </span>{" "}
                                    {config.jsonValue &&
                                    Object.keys(config.jsonValue).length > 0 ? (
                                      <Badge
                                        className="ml-2 font-mono text-blue-500"
                                        variant="outline"
                                      >
                                        <code className="text-[10px]">
                                          JSON Object
                                        </code>
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        {config.value.length > 100
                                          ? `${config.value.substring(0, 100)}...`
                                          : config.value}
                                      </span>
                                    )}
                                  </div>

                                  {config.description && (
                                    <p className="mt-1 text-muted-foreground text-sm">
                                      {config.description}
                                    </p>
                                  )}

                                  {config.url && (
                                    <p className="mt-1 text-sm">
                                      <span className="font-medium">
                                        关联链接:
                                      </span>{" "}
                                      <a
                                        className="text-primary hover:underline"
                                        href={config.url}
                                        rel="noopener noreferrer"
                                        target="_blank"
                                      >
                                        {config.url}
                                      </a>
                                    </p>
                                  )}

                                  <div className="mt-2 text-muted-foreground text-xs">
                                    创建于:{" "}
                                    {new Date(
                                      config.createdAt
                                    ).toLocaleString()}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleEdit(config)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Has permission="SITE_CONFIG_DELETE">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            确认删除
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            确定要删除配置项 "
                                            {config.label ||
                                              getConfigKeyLabel(config.key)}
                                            " 吗？此操作不可撤销。
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            取消
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              handleDelete(config.id)
                                            }
                                          >
                                            删除
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </Has>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
              )}
            </div>
          )}
        </div>
      </div>

      {/* 创建/编辑配置模态框 */}
      <CreateSiteConfigModal
        editingConfig={editingConfig}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setEditingConfig(undefined);
          }
        }}
        onSuccess={handleSuccess}
        open={isCreateModalOpen || !!editingConfig}
      />
    </>
  );
}
