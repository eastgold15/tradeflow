"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Save } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MediaSelect } from "@/components/ui/media-select";
import { useMediaList } from "@/hooks/api/media";
import { useUpdateSku } from "@/hooks/api/sku";
import type { BaseSku } from "@/hooks/api/sku.type";

const formSchema = z.object({
  skuCode: z.string().min(1, "SKU编码不能为空"),
  price: z.number().min(0, "价格不能小于0"),
  marketPrice: z.number().optional(),
  costPrice: z.number().optional(),
  weight: z.number().optional(),
  volume: z.number().optional(),
  stock: z.number().min(0, "库存不能小于0"),
  specJson: z.record(z.string(), z.string()),
  mediaIds: z.array(z.string()).optional(),
  mainImageId: z.string().optional(), // 主图 ID
  status: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditSKUModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  sku?: BaseSku;
}

export function EditSKUModal({
  open,
  onOpenChange,
  onSuccess,
  sku,
}: EditSKUModalProps) {
  const updateSku = useUpdateSku();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      skuCode: "",
      price: 0,
      marketPrice: undefined,
      costPrice: undefined,
      weight: undefined,
      volume: undefined,
      stock: 0,
      specJson: {},
      mediaIds: [],
      mainImageId: undefined,
      status: 1,
    },
  });

  // 获取选中媒体的完整信息（通过 ids 从后端获取）
  const selectedMediaIds = form.watch("mediaIds");
  const { data: mediaList = [] } = useMediaList(
    { ids: selectedMediaIds },
    // 只在有选中的媒体 ID 时才发起请求
    Boolean(selectedMediaIds && selectedMediaIds.length > 0)
  );

  // 创建媒体 ID 到 URL 的映射
  const mediaMap = new Map(
    mediaList.map((media: any) => [media.id, media.url])
  );

  // 当 sku 变化时，填充表单数据
  useEffect(() => {
    if (sku) {
      // 获取图片数据，支持 allImages 和 media 两种格式
      const images = sku.allImages || sku.media || [];
      const mainImage = images.find((img) => img.isMain);
      form.reset({
        skuCode: sku.skuCode || "",
        price:
          typeof sku.price === "string"
            ? Number.parseFloat(sku.price)
            : sku.price || 0,
        marketPrice: sku.marketPrice
          ? Number.parseFloat(String(sku.marketPrice))
          : undefined,
        costPrice: sku.costPrice
          ? Number.parseFloat(String(sku.costPrice))
          : undefined,
        weight: sku.weight ? Number.parseFloat(String(sku.weight)) : undefined,
        volume: sku.volume ? Number.parseFloat(String(sku.volume)) : undefined,
        stock:
          typeof sku.stock === "string"
            ? Number.parseInt(sku.stock, 10)
            : sku.stock || 0,
        specJson: sku.specJson || {},
        mediaIds: images.map((img) => img.id) || [],
        mainImageId: mainImage?.id || images[0]?.id || undefined,
        status: sku.status ?? 1,
      });
    } else {
      form.reset();
    }
  }, [sku, form]);

  const onSubmit = async (data: FormData) => {
    if (!sku) return;

    try {
      await updateSku.mutateAsync({
        id: sku.id,
        data: {
          ...data,
          price: data.price.toString(),
          stock: data.stock.toString(),
          marketPrice: data.marketPrice?.toString(),
          costPrice: data.costPrice?.toString(),
          weight: data.weight?.toString(),
          volume: data.volume?.toString(),
        },
      });
      onSuccess?.();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // 错误已在 mutation 中处理
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  const addSpecValue = () => {
    const currentSpecs = form.getValues("specJson") || {};
    const newKey = `规格${Object.keys(currentSpecs).length + 1}`;
    form.setValue("specJson", {
      ...currentSpecs,
      [newKey]: "",
    });
  };

  const removeSpecValue = (specKey: string) => {
    const currentSpecs = form.getValues("specJson") || {};
    const newSpecs = { ...currentSpecs };
    delete newSpecs[specKey];
    form.setValue("specJson", newSpecs);
  };

  return (
    <Dialog key={sku?.id || "edit"} onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            编辑 SKU: {sku?.skuCode}
          </DialogTitle>
          <DialogDescription>修改 SKU 信息、价格、库存和规格</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* 基础信息 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="skuCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU编码 *</FormLabel>
                    <FormControl>
                      <Input placeholder="SKU-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <FormControl>
                      <select
                        className="w-full rounded-md border p-2"
                        onChange={(e) =>
                          field.onChange(Number.parseInt(e.target.value, 10))
                        }
                        value={field.value}
                      >
                        <option value={1}>启用</option>
                        <option value={0}>禁用</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 价格信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">价格信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="marketPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>零售价</FormLabel>
                        <FormControl>
                          <Input
                            min={0}
                            placeholder="0.00"
                            step={0.01}
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number.parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>批发价 *</FormLabel>
                        <FormControl>
                          <Input
                            min={0}
                            placeholder="0.00"
                            step={0.01}
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>出厂价</FormLabel>
                        <FormControl>
                          <Input
                            min={0}
                            placeholder="0.00"
                            step={0.01}
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number.parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>库存 *</FormLabel>
                        <FormControl>
                          <Input
                            min={0}
                            placeholder="0"
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                Number.parseInt(e.target.value, 10) || 0
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 物流信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">物流信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>重量(kg)</FormLabel>
                        <FormControl>
                          <Input
                            min={0}
                            placeholder="0.000"
                            step={0.001}
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number.parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>体积(m³)</FormLabel>
                        <FormControl>
                          <Input
                            min={0}
                            placeholder="0.000"
                            step={0.001}
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number.parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 规格信息 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm">规格信息</CardTitle>
                <Button
                  onClick={addSpecValue}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  添加规格
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(form.watch("specJson") || {}).map(
                  ([key, value]) => (
                    <div className="flex gap-2" key={key}>
                      <Input
                        className="flex-1"
                        placeholder="规格名"
                        readOnly
                        value={key}
                      />
                      <Input
                        className="flex-1"
                        onChange={(e) => {
                          const currentSpecs = form.getValues("specJson") || {};
                          form.setValue("specJson", {
                            ...currentSpecs,
                            [key]: e.target.value,
                          });
                        }}
                        placeholder="规格值"
                        value={value || ""}
                      />
                      <Button
                        onClick={() => removeSpecValue(key)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        ×
                      </Button>
                    </div>
                  )
                )}
              </CardContent>
            </Card>

            {/* SKU 图片选择 */}
            <FormField
              control={form.control}
              name="mediaIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU 图片</FormLabel>
                  <FormControl>
                    <MediaSelect
                      maxCount={6}
                      multiple
                      onChange={(ids) => {
                        field.onChange(ids);
                        // 如果当前主图不在新选择的图片中，清空主图选择
                        const currentMainId = form.getValues("mainImageId");
                        if (currentMainId && !ids.includes(currentMainId)) {
                          form.setValue("mainImageId", ids[0] || undefined);
                        }
                      }}
                      placeholder="选择 SKU 图片（最多 6 张）"
                      value={field.value || []}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 主图选择 */}
            {form.watch("mediaIds") && form.watch("mediaIds")!.length > 0 && (
              <FormField
                control={form.control}
                name="mainImageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>选择主图</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {form.watch("mediaIds")?.map((mediaId) => {
                          // 优先从 mediaMap 获取，如果不存在则从原始数据获取（支持 allImages 和 media 两种格式）
                          const originalImages =
                            sku?.allImages || sku?.media || [];
                          const imageUrl: string =
                            (mediaMap.get(mediaId) as string | undefined) ||
                            originalImages.find((img) => img.id === mediaId)
                              ?.url ||
                            "";
                          const isSelected = field.value === mediaId;

                          return (
                            <div
                              className={`relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                                isSelected
                                  ? "border-indigo-500 ring-2 ring-indigo-200"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                              key={mediaId}
                              onClick={() => field.onChange(mediaId)}
                            >
                              {imageUrl && imageUrl !== "" ? (
                                <Image
                                  alt="SKU 图片"
                                  className="object-cover"
                                  fill
                                  sizes="80px"
                                  src={imageUrl}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400 text-xs">
                                  无图片
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                disabled={updateSku.isPending}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                取消
              </Button>
              <Button disabled={updateSku.isPending} type="submit">
                {updateSku.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存更改"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
