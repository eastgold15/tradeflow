"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  FolderOpen,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MasterCategorySelect } from "@/components/ui/master-category-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateTemplate, useUpdateTemplate } from "@/hooks/api/template";
import { type Template } from "@/types/template";
import { TemplateFieldRow } from "./TemplateFieldRow/TemplateFieldRow";

// 辅助函数
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");

// Zod 验证 schema
const templateFieldSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1, "显示名称不能为空"),
  inputType: z.enum(["text", "number", "select", "multiselect"]),
  value: z.string(),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        value: z.string(),
      })
    )
    .optional(),
  isRequired: z.boolean().default(false),
  isSkuSpec: z.boolean().default(false),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "模版名称不能为空"),
  masterCategoryId: z.string().min(1, "请选择主分类"),
  // siteCategoryId: z.string().optional(),
  fields: z
    .array(templateFieldSchema)
    .min(1, "至少需要添加一个字段定义")
    .refine((fields) => fields.every((f) => f.key.trim() !== ""), {
      message: "所有字段的显示名称不能为空",
    }),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;
type TemplateFormField = z.infer<typeof templateFieldSchema>;

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingTemplate?: Template | null;
}

export function CreateTemplateModal({
  open,
  onOpenChange,
  onSuccess,
  editingTemplate,
}: CreateTemplateModalProps) {
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const isEdit = !!editingTemplate;

  // react-hook-form 配置
  const form = useForm({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      masterCategoryId: "",
      // siteCategoryId: "",
      fields: [],
    },
  });

  const { control, handleSubmit, reset } = form;
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "fields",
  });

  // 当编辑的模版变化时，重置表单
  useEffect(() => {
    if (editingTemplate) {
      reset({
        name: editingTemplate.name || "",
        masterCategoryId: editingTemplate.masterCategoryId || "",
        // siteCategoryId: editingTemplate.siteCategoryId || "",
        fields:
          editingTemplate.fields?.map((f) => ({
            id: f.id,
            key: f.key || "",
            inputType: f.inputType || "text",
            value: f.value || "",
            // 🔥 直接使用后端传来的 options 对象数组（已包含 UUID）
            options: f.options || [],
            isRequired: f.isRequired ?? false,
            isSkuSpec: f.isSkuSpec ?? false,
          })) || [],
      });
    } else {
      reset({
        name: "",
        masterCategoryId: "",
        // siteCategoryId: "",
        fields: [],
      });
    }
  }, [editingTemplate, reset]);

  // 添加字段
  const handleAddField = () => {
    const id = Date.now().toString();
    append({
      id: undefined,
      key: "",
      inputType: "text",
      isRequired: false,
      isSkuSpec: false,
      value: "",
      options: [],
    });
  };

  // 提交表单
  const onSubmit = async (data: TemplateFormValues) => {
    try {
      const submitData = {
        name: data.name.trim(),
        masterCategoryId: data.masterCategoryId,
        // ...(data.siteCategoryId && { siteCategoryId: data.siteCategoryId }),
        fields: data.fields.map((f) => ({
          ...(f.id && { id: f.id }), // 🔥 传回 field.id，用于更新而非删除重建
          key: f.key,
          inputType: f.inputType,
          isRequired: f.isRequired,
          isSkuSpec: f.isSkuSpec,
          value: f.value,
          ...(f.options &&
            f.options.length > 0 && {
            options: f.options,
          }),
        })),
      };

      if (isEdit) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          data: submitData,
        });
        toast.success("模版更新成功");
      } else {
        await createMutation.mutateAsync(submitData);
        toast.success("模版创建成功");
      }

      onSuccess?.();
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "操作失败");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {isEdit ? "编辑商品模版" : "创建商品模版"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "修改商品模版的字段定义和配置"
              : "创建新的商品模版，定义商品的属性字段"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* 基础配置 */}
              <div className="space-y-4 py-4">
                <h3 className="font-semibold text-lg">基础配置</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          模版名称 <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="例如：电子产品标准模版"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="masterCategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          主分类 <span className="text-red-500">*</span>
                        </FormLabel>
                        <MasterCategorySelect
                          onChange={field.onChange}
                          placeholder="选择主分类"
                          value={field.value}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* 字段定义 */}
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">字段定义</h3>
                  <Button
                    onClick={handleAddField}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    添加字段
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed py-10 text-center">
                    <p className="text-slate-400">
                      暂无字段，点击"添加字段"开始定义
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* {fields.map((field, index) => (
                      <TemplateFieldItem
                        control={control}
                        field={{
                          ...field,
                          isRequired: field.isRequired ?? false,
                          isSkuSpec: field.isSkuSpec ?? false,
                        }}
                        index={index}
                        isFirst={index === 0}
                        isLast={index === fields.length - 1}
                        key={field.id}
                        onMove={move}
                        onRemove={remove}
                      />
                    ))} */}

                    {fields.map((field, index) => (
                      <TemplateFieldRow
                        control={form.control}
                        index={index}
                        isFirst={index === 0}
                        isLast={index === fields.length - 1}
                        key={field.id}
                        onMoveDown={() => move(index, index + 1)}
                        onMoveUp={() => move(index, index - 1)}
                        onRemove={() => remove(index)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  disabled={isLoading}
                  onClick={() => handleOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  取消
                </Button>
                <Button disabled={isLoading} type="submit">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEdit ? "保存中..." : "创建中..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-1 h-4 w-4" />
                      {isEdit ? "保存修改" : "创建模版"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 字段项组件
interface TemplateFieldItemProps {
  control: any;
  field: TemplateFormField;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

function TemplateFieldItem({
  control,
  field,
  index,
  isFirst,
  isLast,
  onRemove,
  onMove,
}: TemplateFieldItemProps) {
  // 监听当前字段的 options 值用于显示预览标签
  const options = useWatch({
    control,
    name: `fields.${index}.options`,
  });

  return (
    <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">
          字段 #{index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:text-indigo-600 disabled:opacity-20"
            disabled={isFirst}
            onClick={() => onMove(index, index - 1)}
            type="button"
          >
            <ArrowUp size={14} />
          </button>
          <button
            className="p-1 hover:text-indigo-600 disabled:opacity-20"
            disabled={isLast}
            onClick={() => onMove(index, index + 1)}
            type="button"
          >
            <ArrowDown size={14} />
          </button>
          <button
            className="ml-2 p-1 text-slate-400 hover:text-red-500"
            onClick={() => onRemove(index)}
            type="button"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <FormField
          control={control}
          name={`fields.${index}.key`}
          render={({ field }) => (
            <FormItem className="col-span-4">
              <FormLabel className="font-bold text-xs uppercase">
                显示名称
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    // 自动更新 code
                    const form = control._form;
                    form.setValue(
                      `fields.${index}.code`,
                      slugify(e.target.value)
                    );
                  }}
                  placeholder="例如：颜色"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* <FormField
          control={control}
          name={`fields.${index}.code`}
          render={({ field }) => (
            <FormItem className="col-span-4">
              <FormLabel className="font-bold text-xs uppercase">
                API 代码
              </FormLabel>
              <div className="flex h-9 items-center rounded border bg-slate-100 px-3 font-mono text-slate-500 text-xs">
                {field.value}
              </div>
            </FormItem>
          )}
        /> */}

        <FormField
          control={control}
          name={`fields.${index}.inputType`}
          render={({ field }) => (
            <FormItem className="col-span-4">
              <FormLabel className="font-bold text-xs uppercase">
                输入类型
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="text">文本输入</SelectItem>
                  <SelectItem value="number">数字</SelectItem>
                  <SelectItem value="select">下拉选择</SelectItem>
                  <SelectItem value="multiselect">多选下拉</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`fields.${index}.inputType`}
          render={({ field }) => (
            <FormItem className="col-span-12">
              {field.value === "text" || field.value === "number" ? (
                <>
                  <FormLabel className="font-bold text-xs uppercase">
                    占位符内容
                  </FormLabel>
                  <FormField
                    control={control}
                    name={`fields.${index}.value`}
                    render={({ field: valueField }) => (
                      <FormControl>
                        {field.value === "number" ? (
                          <Input
                            {...valueField}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
                                valueField.onChange(val);
                              }
                            }}
                            placeholder="例如：199.99"
                            type="text"
                          />
                        ) : (
                          <Input
                            {...valueField}
                            placeholder="例如：请输入产品尺寸"
                          />
                        )}
                      </FormControl>
                    )}
                  />
                </>
              ) : (
                <>
                  <FormLabel className="font-bold text-xs uppercase">
                    选项（每行一个）
                  </FormLabel>
                  <FormField
                    control={control}
                    name={`fields.${index}.options`}
                    render={({ field: optionsField }) => (
                      <div className="relative">
                        <FormControl>
                          <textarea
                            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onChange={(e) => {
                              const text = e.target.value;
                              const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);

                              // 获取当前的 options 状态，用于保留已有的 UUID
                              const currentOptions = options || [];

                              const newOptions = lines.map((line) => {
                                // 尝试在现有 options 中找匹配文字的项，保留其 UUID
                                const existing = currentOptions.find((o: any) => o.value === line);
                                return {
                                  id: existing?.id, // 如果是新输入的文字，id 就是 undefined
                                  value: line,
                                };
                              });

                              optionsField.onChange(newOptions);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                              }
                            }}
                            placeholder="例如：小号、中号、大号、特大号"
                            rows={4}
                            value={
                              Array.isArray(options)
                                ? options.map((opt) => opt.value).join("\n")
                                : ""
                            }
                          />
                        </FormControl>
                        <p className="mt-1 text-slate-400 text-xs">
                          💡 输入选项后按 Enter 换行，失焦自动保存
                        </p>
                      </div>
                    )}
                  />
                  {options && options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt: any, idx: number) => (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-indigo-700 text-xs"
                          key={idx}
                        >
                          {opt.value}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </FormItem>
          )}
        />

        <div className="col-span-12 flex items-center gap-6 border-t pt-2">
          <FormField
            control={control}
            name={`fields.${index}.isRequired`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <input
                    checked={field.value}
                    className="rounded"
                    onChange={field.onChange}
                    type="checkbox"
                  />
                </FormControl>
                <FormLabel className="cursor-pointer text-sm">必填</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`fields.${index}.isSkuSpec`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <input
                    checked={field.value}
                    className="rounded"
                    onChange={field.onChange}
                    type="checkbox"
                  />
                </FormControl>
                <FormLabel className="cursor-pointer font-medium text-indigo-600 text-sm">
                  作为 SKU 规格
                </FormLabel>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
