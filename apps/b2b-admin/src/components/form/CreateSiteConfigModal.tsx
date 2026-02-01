"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
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
import { zodResolver } from "@hookform/resolvers/zod";
import type { SiteConfigContract } from "@repo/contract";
import {
  SITE_CONFIG_KEY_OPTIONS
} from "@repo/contract";
import { Code2, Loader2, Type } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeepNonNullable } from "@/types/utils";
import { Editor } from "@monaco-editor/react";
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

export function CreateSiteConfigModal({ open, onOpenChange, onSuccess, editingConfig }: CreateSiteConfigModalProps) {
  const createSiteConfig = useCreateSiteConfig();
  const updateSiteConfig = useUpdateSiteConfig();
  const isEdit = !!editingConfig;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "", value: "", jsonValue: {}, description: "",
      category: "general", url: "",
      translatable: true, visible: false, siteId: "", mode: "text",
    },
  });

  // 监听编辑状态，自动判断进入哪种模式
  useEffect(() => {
    if (editingConfig) {
      const hasJson = editingConfig.jsonValue && Object.keys(editingConfig.jsonValue).length > 0;
      form.reset({
        key: editingConfig.key,
        value: editingConfig.value ?? "",
        jsonValue: editingConfig.jsonValue ?? {},
        description: editingConfig.description ?? "",  // null -> 空字符串
        category: editingConfig.category ?? "general",
        url: editingConfig.url ?? "",                   // null -> 空字符串
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
        // 更新时：只发送 Update 契约中定义的字段，排除 siteId、mode、jsonValue
        const updateData = {
          key: data.key,
          value,
          description: data.description,
          category: data.category,
          url: data.url,
          translatable: data.translatable,
          visible: data.visible,
        };
        await updateSiteConfig.mutateAsync({ id: editingConfig.id, data: updateData });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-200 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑配置" : "创建配置"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form id="site-config-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 overflow-y-auto px-1">

            {/* 基础字段区 (SiteId, Key) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="siteId" render={({ field }) => (
                <FormItem>
                  <FormLabel>所属站点</FormLabel>
                  <SiteSelect value={field.value} onChange={field.onChange} disabled={isEdit} />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="key" render={({ field }) => (
                <FormItem>
                  <FormLabel>配置类型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SITE_CONFIG_KEY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>


            {/* 内容编辑模式切换 */}
            <div className="space-y-2">
              <FormLabel>配置内容编辑模式</FormLabel>
              <Tabs value={currentMode} onValueChange={(v) => form.setValue("mode", v as "text" | "json")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text"><Type className="w-4 h-4 mr-2" />普通文本</TabsTrigger>
                  <TabsTrigger value="json"><Code2 className="w-4 h-4 mr-2" />高级 JSON</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 动态内容区 */}
            {currentMode === "text" ? (
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormControl><Textarea className="min-h-37.5 font-mono" placeholder="输入配置文本..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <div className="h-75 border rounded-md overflow-hidden bg-black">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme="vs-dark"
                  value={JSON.stringify(form.getValues("jsonValue"), null, 2)}
                  options={{ minimap: { enabled: false }, fontSize: 13, formatOnPaste: true }}
                  onChange={(val) => {
                    try { form.setValue("jsonValue", JSON.parse(val || "{}")); } catch (e) { /* 允许暂时的语法错误 */ }
                  }}
                />
              </div>
            )}

            {/* 其他字段 (Description, URL, Switches) ... */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>备注说明</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-8 py-2">
              <FormField control={form.control} name="translatable" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel>可翻译</FormLabel>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="visible" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel>前端可见</FormLabel>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </form>
        </Form>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button disabled={isLoading} form="site-config-form" type="submit">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "更新配置" : "立即创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}