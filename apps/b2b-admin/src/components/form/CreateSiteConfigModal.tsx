"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SiteConfigContract } from "@repo/contract";
import {
  SITE_CATEGORY_ENUM,
  SITE_CATEGORY_OPTIONS,
  SITE_CONFIG_KEY_OPTIONS,
} from "@repo/contract";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteSelect } from "@/components/ui/site-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateSiteConfig,
  useUpdateSiteConfig,
} from "@/hooks/api/site-config";

const formSchema = z.object({
  key: z.string().min(1, "配置类型不能为空"),
  value: z.string().min(1, "配置内容不能为空"),
  description: z.string().optional(),
  category: z.string().default("general"),
  url: z.string().optional(),
  translatable: z.boolean().default(true),
  visible: z.boolean().default(false),
  siteId: z.string().min(1, "请选择站点"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateSiteConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingConfig?: SiteConfigContract["Response"];
}

export function CreateSiteConfigModal({
  open,
  onOpenChange,
  onSuccess,
  editingConfig,
}: CreateSiteConfigModalProps) {
  const createSiteConfig = useCreateSiteConfig();
  const updateSiteConfig = useUpdateSiteConfig();

  const isEdit = !!editingConfig;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
      value: "",
      description: "",
      category: SITE_CATEGORY_ENUM.FUSHI,
      url: "",
      translatable: true,
      visible: false,
      siteId: "",
    },
  });

  // 当编辑的配置变化时，重置表单
  useEffect(() => {
    if (editingConfig) {
      form.reset({
        key: editingConfig.key,
        value: editingConfig.value,
        description: editingConfig.description || "",
        category: editingConfig.category || "general",
        url: editingConfig.url || "",
        translatable: editingConfig.translatable ?? true,
        visible: editingConfig.visible ?? false,
        siteId: editingConfig.siteId,
      });
    } else {
      form.reset({
        key: "",
        value: "",
        description: "",
        category: "general",
        url: "",
        translatable: true,
        visible: false,
        siteId: "",
      });
    }
  }, [editingConfig, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const submitData = {
        ...data,
        description: data.description || null,
        category: data.category || "general",
        url: data.url || null,
      };

      if (isEdit && editingConfig) {
        await updateSiteConfig.mutateAsync({
          id: editingConfig.id,
          data: submitData,
        });
      } else {
        await createSiteConfig.mutateAsync(submitData);
      }
      onSuccess?.();

      // Delay closing to avoid DOM conflicts
      setTimeout(() => {
        onOpenChange(false);
        form.reset();
      }, 100);
    } catch (error) {
      // 错误已在 mutation 中处理
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Use setTimeout to avoid DOM manipulation conflicts
      setTimeout(() => {
        form.reset();
      }, 0);
    }
    onOpenChange(isOpen);
  };

  const isLoading = createSiteConfig.isPending || updateSiteConfig.isPending;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑站点配置" : "创建站点配置"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "修改站点配置信息"
              : "为站点添加新的配置项，支持多语言和可见性控制"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            id="site-config-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {/* --- 增加滚动区域容器 --- */}
            <div className="max-h-[60vh] overflow-y-auto px-1 py-2">
              <div className="space-y-4">
                {" "}
                {/* 内部间距保持一致 */}
                <FormField
                  control={form.control}
                  name="siteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>所属站点 （必填）</FormLabel>
                      <FormControl>
                        <SiteSelect
                          disabled={isEdit}
                          onChange={field.onChange}
                          placeholder="请选择站点"
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>选择此配置项所属的站点</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>配置类型 （必填）</FormLabel>
                      <Select
                        disabled={isEdit}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择配置类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SITE_CONFIG_KEY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>选择配置项的类型</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>配置内容 （必填）</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[80px]"
                          placeholder="请输入配置内容"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        你所需要修改的内容，支持文本、链接等多种格式
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>配置说明（选填）</FormLabel>
                      <FormControl>
                        <Input placeholder="配置项的说明" {...field} />
                      </FormControl>
                      <FormDescription>简要描述此配置项的用途</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>所属公司分类 （必填）</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择工厂/公司分类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SITE_CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        选择配置项所属的工厂/公司分类
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>url</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormDescription>可选的关联链接地址</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="translatable"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>可翻译</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>是否支持多语言翻译</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visible"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>前端可见</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>是否在前端展示</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            取消
          </Button>
          <Button disabled={isLoading} form="site-config-form" type="submit">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "保存中..." : "创建中..."}
              </>
            ) : isEdit ? (
              "保存修改"
            ) : (
              "创建配置"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
