"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Editor } from "@monaco-editor/react";
import type { SiteConfigContract } from "@repo/contract";
import { Code2, Loader2, Type } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { SiteConfigKeySelect } from "@/components/ui/site-config-key-select";
import { SiteSelect } from "@/components/ui/site-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateSiteConfig,
  useUpdateSiteConfig,
} from "@/hooks/api/site-config";
import { DeepNonNullable } from "@/types/utils";

interface CreateSiteConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingConfig?: DeepNonNullable<SiteConfigContract["Response"]>;
}

const formSchema = z.object({
  key: z.string().min(1, "配置类型不能为空"),
  value: z.string().optional(),
  jsonValue: z.any().optional(),
  description: z.string().optional(),
  category: z.string().default("general"),
  url: z.string().optional(),
  translatable: z.boolean().default(true),
  visible: z.boolean().default(false),
  siteId: z.string().min(1, "请选择站点"),
  mode: z.enum(["text", "json"]).default("text"),
});

type FormData = z.infer<typeof formSchema>;

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
      jsonValue: {},
      description: "",
      category: "general",
      url: "",
      translatable: true,
      visible: false,
      siteId: "",
      mode: "text",
    },
  });

  // 监听编辑状态，自动判断进入哪种模式
  useEffect(() => {
    if (editingConfig) {
      const hasJson =
        editingConfig.jsonValue &&
        Object.keys(editingConfig.jsonValue).length > 0;
      form.reset({
        key: editingConfig.key,
        value: editingConfig.value ?? "",
        jsonValue: editingConfig.jsonValue ?? {},
        description: editingConfig.description ?? "", // null -> 空字符串
        category: editingConfig.category ?? "general",
        url: editingConfig.url ?? "", // null -> 空字符串
        translatable: editingConfig.translatable ?? true,
        visible: editingConfig.visible ?? false,
        siteId: editingConfig.siteId,
        mode: hasJson ? "json" : "text",
      });
    }
  }, [editingConfig, form]);

  // 监听表单验证错误，帮助调试
  const errors = form.formState.errors;
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("🔴 表单验证失败详情:", errors);
    }
  }, [errors]);

  const onSubmit = async (data: FormData) => {
    try {
      // 根据模式准备内容
      const value = data.mode === "text" ? data.value : "[JSON Object]";
      const jsonValue = data.mode === "json" ? data.jsonValue : null;

      if (isEdit && editingConfig) {
        // 更新时：根据模式发送对应的字段
        const updateData = {
          key: data.key,
          value,
          jsonValue: data.mode === "json" ? data.jsonValue : undefined,
          description: data.description,
          category: data.category,
          url: data.url,
          translatable: data.translatable,
          visible: data.visible,
        };
        await updateSiteConfig.mutateAsync({
          id: editingConfig.id,
          data: updateData,
        });
      } else {
        // 创建时：发送所有必要字段
        const createData = {
          siteId: data.siteId,
          key: data.key,
          value,
          jsonValue,
          description: data.description,
          category: data.category,
          url: data.url,
          translatable: data.translatable,
          visible: data.visible,
        };
        await createSiteConfig.mutateAsync(createData);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      throw error;
    }
  };

  const currentMode = form.watch("mode");
  const isLoading = createSiteConfig.isPending || updateSiteConfig.isPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-200">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑配置" : "创建配置"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="flex-1 space-y-4 overflow-y-auto px-1"
            id="site-config-form"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {/* 基础字段区 (SiteId, Key) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所属站点</FormLabel>
                    <SiteSelect
                      disabled={isEdit}
                      onChange={field.onChange}
                      value={field.value}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>配置类型</FormLabel>
                    <SiteConfigKeySelect
                      onChange={field.onChange}
                      placeholder="选择或输入配置键..."
                      value={field.value}
                    />
                    <FormDescription>
                      {isEdit
                        ? "⚠️ 修改配置键会改变数据库中的唯一标识"
                        : "从预设选择或输入自定义配置键"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 内容编辑模式切换 */}
            <div className="space-y-2">
              <FormLabel>配置内容编辑模式</FormLabel>
              <Tabs
                onValueChange={(v) =>
                  form.setValue("mode", v as "text" | "json")
                }
                value={currentMode}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">
                    <Type className="mr-2 h-4 w-4" />
                    普通文本
                  </TabsTrigger>
                  <TabsTrigger value="json">
                    <Code2 className="mr-2 h-4 w-4" />
                    高级 JSON
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 动态内容区 */}
            {currentMode === "text" ? (
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="min-h-37.5 font-mono"
                        placeholder="输入配置文本..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="h-75 overflow-hidden rounded-md border bg-black">
                <Editor
                  defaultLanguage="json"
                  height="100%"
                  onChange={(val) => {
                    try {
                      form.setValue("jsonValue", JSON.parse(val || "{}"));
                    } catch (e) {
                      /* 允许暂时的语法错误 */
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    formatOnPaste: true,
                  }}
                  theme="vs-dark"
                  value={JSON.stringify(form.getValues("jsonValue"), null, 2)}
                />
              </div>
            )}

            {/* 其他字段 (Description, URL, Switches) ... */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注说明</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-8 py-2">
              <FormField
                control={form.control}
                name="translatable"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>可翻译</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visible"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>前端可见</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter className="border-t pt-4">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            取消
          </Button>
          <Button disabled={isLoading} form="site-config-form" type="submit">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "更新配置" : "立即创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
