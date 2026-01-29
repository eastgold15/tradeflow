"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Play,
  Plus,
  X,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateInquiry } from "@/hooks/api/inquiry-hook";
import { type ProductDetailRes } from "@/hooks/api/site-product";
import { cn } from "@/lib/utils";
import { InquiryForm, type InquiryFormValues } from "./InquiryForm";
import { SuccessView } from "./SuccessView";

// ----------------------------------------------------------------------
// 1. 常量与工具函数 (移出组件外部，避免重复创建)
// ----------------------------------------------------------------------

const PAYMENT_METHODS = [
  "Cash on Delivery",
  "30% Deposit, Balance against B/L",
  "L/C at 30 days sight",
];

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".avi", ".mkv"];

const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
};

const getActualMediaType = (media: {
  mediaType?: string;
  url: string;
}): "video" | "image" => {
  if (isVideoUrl(media.url)) return "video";
  return (media.mediaType as "video" | "image") || "image";
};

/**
 * 核心逻辑：媒体排序与过滤
 * 规则：优先显示 SKU 图片 -> 其次 SPU 图片 -> 视频放最后
 */
const filterAndSortMedia = (
  allMedia: any[],
  skus: any[],
  colorKey: string | undefined,
  selectedColor: string | undefined
) => {
  let targetMedia = allMedia;

  // 如果选择了颜色，尝试过滤该颜色的专属图片
  if (colorKey && selectedColor) {
    // 1. 找到该颜色对应的所有 SKU
    const matchingSkus = skus.filter((sku) => {
      const specJson = (sku.specJson as Record<string, string>) || {};
      return specJson[colorKey] === selectedColor;
    });

    // 2. 收集这些 SKU 的 mediaIds
    const mediaIds = new Set<string>();
    matchingSkus.forEach((sku) => {
      sku.mediaIds?.forEach((id: string) => mediaIds.add(id));
    });

    // 3. 只有当该颜色确实有配置图片时才过滤，否则回退到显示所有图
    if (mediaIds.size > 0) {
      targetMedia = allMedia.filter((m) => mediaIds.has(m.id));
    }
  }

  // 排序：SPU主图优先(sortOrder < 1000) -> 图片在前 -> 视频在后 -> 按 sortOrder
  return [...targetMedia].sort((a, b) => {
    // 优先显示 SPU 级的基础图 (通常 sortOrder 很小)
    const isASpuBase = (a.sortOrder ?? 0) < 1000;
    const isBSpuBase = (b.sortOrder ?? 0) < 1000;
    // 如果策略需要可以在这里调整，目前保留原逻辑结构，主要优化 Video 排序

    const aIsVideo = getActualMediaType(a) === "video";
    const bIsVideo = getActualMediaType(b) === "video";

    if (aIsVideo && !bIsVideo) return 1; // 视频排后
    if (!aIsVideo && bIsVideo) return -1; // 视频排后
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
};

/**
 * 核心逻辑：解析多地区尺码
 */
const parseSizeVariants = (specOptions: Record<string, string[]>) => {
  const sizeKey = Object.keys(specOptions).find((k) =>
    k.toLowerCase().includes("size")
  );

  if (!sizeKey) return null;

  const sizeValues = specOptions[sizeKey] || [];
  const regionGroups: Record<string, string[]> = { EU: [], UK: [], US: [] };

  sizeValues.forEach((value) => {
    // 格式检查: "EU36,UK3,US5"
    const parts = value.split(",").map((p) => p.trim());
    const hasMultiRegion =
      parts.length > 1 && parts.every((p) => /^(EU|UK|US)\d+(\.\d+)?$/.test(p));

    if (hasMultiRegion) {
      parts.forEach((part) => {
        const match = part.match(/^(EU|UK|US)(\d+(\.\d+)?)$/);
        if (match) regionGroups[match[1]].push(match[2]);
      });
    } else {
      // 兼容单格式: "36" 或 "EU36"
      const match = value.match(/^(EU|UK|US)?(\d+(\.\d+)?)$/);
      if (match) {
        const region = match[1] || "EU"; // 默认归为 EU 或 INT
        const size = match[2];
        if (!regionGroups[region]) regionGroups[region] = [];
        regionGroups[region].push(size);
      }
    }
  });

  // 去重并排序
  Object.keys(regionGroups).forEach((region) => {
    regionGroups[region] = [...new Set(regionGroups[region])].sort(
      (a, b) => Number.parseFloat(a) - Number.parseFloat(b)
    );
  });

  // 过滤掉空数组
  const activeRegions = Object.fromEntries(
    Object.entries(regionGroups).filter(([_, v]) => v.length > 0)
  );

  return { sizeKey, regionGroups: activeRegions };
};

// ----------------------------------------------------------------------
// 自定义属性展示组件
// 特殊处理 detail 字段（分号分割）
// ----------------------------------------------------------------------
const CustomAttributesSection = ({
  customAttributes,
}: {
  customAttributes?: Record<string, string>;
}) => {
  if (!customAttributes || Object.keys(customAttributes).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {Object.entries(customAttributes).map(([key, value]) => {
        // 特殊处理 detail 字段：分号分割成列表
        if (key.toLowerCase() === "details" && value.includes(";")) {
          const detailItems = value
            .split(";")
            .map((item) => item.trim())
            .filter(Boolean);
          console.log("detailItems:", detailItems);
          return (
            <div key={key}>
              {/* <span className="mr-4 font-bold font-sans text-[10px] uppercase">
                {key}
              </span> */}
              <ul className="ml-6 list-disc space-y-1">
                {detailItems.map((item, idx) => (
                  <li className="font-serif text-lg text-gray-800" key={idx}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // 普通字段：直接显示 key-value
        return (
          <p key={key}>
            <span className="mr-4 font-bold font-sans text-[10px] uppercase">
              {key}
            </span>
            <span className="font-serif text-lg text-gray-800">{value}</span>
          </p>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. 主组件
// ----------------------------------------------------------------------

interface ProductDetailProps {
  siteProduct: ProductDetailRes;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ siteProduct }) => {
  // --- 基础状态 ---
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "details">(
    "description"
  );
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[1]);

  // --- 询盘状态 ---
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // --- 规格选择状态 ---
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>(
    {}
  );
  // 这里专门独立一个 activeRegion 状态给尺码选择器用
  const [activeSizeRegion, setActiveSizeRegion] = useState<string>("EU");

  const inquiryMutation = useCreateInquiry();

  // 1. 拆解基础数据
  const skus = useMemo(() => siteProduct.skus || [], [siteProduct]);
  const allMedia = useMemo(() => siteProduct.gallery || [], [siteProduct]);

  // 2. 计算 Spec 选项 Map (Key -> Set<Value>)
  const specOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    skus.forEach((sku) => {
      const specJson = (sku.specJson as Record<string, string>) || {};
      Object.entries(specJson).forEach(([key, value]) => {
        if (!options[key]) options[key] = new Set();
        options[key].add(value);
      });
    });
    return Object.fromEntries(
      Object.entries(options).map(([key, values]) => [key, Array.from(values)])
    );
  }, [skus]);

  // 3. 识别特殊的 Key (Color, Size)
  const colorKey = useMemo(
    () => Object.keys(specOptions).find((k) => /color|colour/i.test(k)),
    [specOptions]
  );

  const parsedSizeData = useMemo(
    () => parseSizeVariants(specOptions),
    [specOptions]
  );

  // 4. 初始化逻辑：默认选中第一个颜色，默认尺码地区
  const isInitialized = useRef(false);
  useEffect(() => {
    if (!isInitialized.current) {
      // 初始化尺码地区
      if (parsedSizeData) {
        const firstRegion = Object.keys(parsedSizeData.regionGroups)[0] || "EU";
        setActiveSizeRegion(firstRegion);
      }
      // 初始化颜色 (如果有)
      if (colorKey && specOptions[colorKey]?.length > 0) {
        setSelectedSpecs((prev) => ({
          ...prev,
          [colorKey]: specOptions[colorKey][0],
        }));
      }
      isInitialized.current = true;
    }
  }, [colorKey, specOptions, parsedSizeData]);

  // 5. 计算当前选中的 SKU
  const selectedSku = useMemo(() => {
    const specKeys = Object.keys(specOptions);
    // 简单校验：必须选满所有规格
    if (
      specKeys.length === 0 ||
      Object.keys(selectedSpecs).length < specKeys.length
    ) {
      return undefined;
    }

    return skus.find((sku) => {
      const specJson = (sku.specJson as Record<string, string>) || {};
      return Object.entries(selectedSpecs).every(([key, value]) => {
        const skuValue = specJson[key];
        // 针对尺码的特殊匹配逻辑 (EU36 匹配 "EU36,UK3...")
        if (key === parsedSizeData?.sizeKey) {
          return skuValue
            .split(",")
            .map((p) => p.trim())
            .includes(value);
        }
        return skuValue === value;
      });
    });
  }, [skus, selectedSpecs, specOptions, parsedSizeData]);

  // 6. 计算展示价格
  const displayPrice = useMemo(() => {
    if (selectedSku) return Number(selectedSku.price);
    if (skus.length === 0) return 0;
    return Math.min(...skus.map((s) => Number(s.price)));
  }, [selectedSku, skus]);

  // 7. 计算展示的媒体列表 (根据颜色筛选 + 排序)
  const displayGallery = useMemo(() => {
    const selectedColor = colorKey ? selectedSpecs[colorKey] : undefined;
    return filterAndSortMedia(allMedia, skus, colorKey, selectedColor);
  }, [allMedia, skus, colorKey, selectedSpecs]);

  // 媒体切换时的防越界保护
  useEffect(() => {
    // 只有当当前索引超出新画廊的范围时才重置（防止从由多图的颜色切换到少图的颜色时崩溃）
    // 同时这也保留了 handleSpecChange 中可能设定的特定索引跳转（只要该索引在有效范围内）
    if (activeMediaIndex >= displayGallery.length) {
      setActiveMediaIndex(0);
    }
  }, [displayGallery, activeMediaIndex]);
  // --- Handlers ---

  const handleSpecChange = (key: string, value: string) => {
    const isDeselect = selectedSpecs[key] === value;

    // 更新规格状态
    setSelectedSpecs((prev) => {
      if (isDeselect) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });

    // 尝试寻找关联的图片并跳转 (仅在选择非取消操作时)
    if (!isDeselect) {
      const matchedSku = skus.find((s) => {
        const sJson = s.specJson as Record<string, string>;
        // 尺码特殊处理
        if (key === parsedSizeData?.sizeKey) {
          return sJson[key]?.includes(value);
        }
        return sJson[key] === value;
      });

      if (matchedSku?.mediaIds?.[0]) {
        const targetIdx = allMedia.findIndex(
          (m) => m.id === matchedSku.mediaIds[0]
        );
        // 注意：这里需要计算的是在 displayGallery 中的索引，还是切换回全局？
        // 简化逻辑：如果在当前 displayGallery 找得到就切，找不到就切回 0
        const idxInDisplay = displayGallery.findIndex(
          (m) => m.id === matchedSku.mediaIds[0]
        );
        if (idxInDisplay !== -1) setActiveMediaIndex(idxInDisplay);
      }
    }
  };

  const handleInquirySubmit = async (values: InquiryFormValues) => {
    if (!selectedSku) return alert("Please select all product options first.");
    try {
      const { remarks, ...contactInfo } = values;
      localStorage.setItem("gina_user_info", JSON.stringify(contactInfo));

      await inquiryMutation.mutateAsync({
        siteProductId: siteProduct.id,
        siteSkuId: selectedSku.id,
        skuMediaId: selectedSku.mediaIds?.[0] || "",
        productName: siteProduct.name,
        productDesc: siteProduct.description || "",
        paymentMethod,
        customerRemarks: remarks || "",
        quantity,
        customerCompany: values.company,
        customerEmail: values.email || "",
        customerPhone: values.phone || "",
        customerWhatsapp: values.whatsapp || "",
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowInquiryForm(false);
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  };

  // --- 渲染部分变量 ---
  const currentMedia = displayGallery[activeMediaIndex];

  return (
    <div className="min-h-screen bg-white pt-16 pb-16">
      <div className="mx-auto max-w-325 px-6">
        <div className="mb-24 grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* --- 左侧：画廊区域 --- */}
          <div className="flex flex-col items-center lg:col-span-7">
            {/* 主图 */}
            <div className="group relative mb-8 aspect-4/3 w-full overflow-hidden bg-gray-50">
              {displayGallery.length > 1 && (
                <>
                  <button
                    className="absolute top-1/2 left-0 z-10 -translate-y-1/2 p-4 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() =>
                      setActiveMediaIndex(
                        (p) =>
                          (p - 1 + displayGallery.length) %
                          displayGallery.length
                      )
                    }
                  >
                    <ChevronLeft className="h-8 w-8 text-gray-400 hover:text-black" />
                  </button>
                  <button
                    className="absolute top-1/2 right-0 z-10 -translate-y-1/2 p-4 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() =>
                      setActiveMediaIndex(
                        (p) => (p + 1) % displayGallery.length
                      )
                    }
                  >
                    <ChevronRight className="h-8 w-8 text-gray-400 hover:text-black" />
                  </button>
                </>
              )}

              {currentMedia &&
                (getActualMediaType(currentMedia) === "video" ? (
                  <video
                    autoPlay
                    className="h-full w-full object-contain mix-blend-multiply"
                    controls
                    key={currentMedia.url}
                    loop
                    muted
                    src={currentMedia.url} // Key change forces reload
                  />
                ) : (
                  <Image
                    alt={siteProduct.name}
                    className="object-contain mix-blend-multiply"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    src={currentMedia.url}
                  />
                ))}
            </div>

            {/* 缩略图列表 */}
            <div className="no-scrollbar flex max-w-full space-x-4 overflow-x-auto pb-2">
              {displayGallery.map((media, idx) => {
                const isVideo = getActualMediaType(media) === "video";
                return (
                  <button
                    className={cn(
                      "relative h-20 w-20 shrink-0 overflow-hidden rounded border-2 transition-all",
                      activeMediaIndex === idx
                        ? "border-black shadow-lg"
                        : "border-gray-200 hover:border-gray-400"
                    )}
                    key={`${media.id}-${idx}`}
                    onClick={() => setActiveMediaIndex(idx)}
                  >
                    {isVideo ? (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100">
                        <Play className="h-6 w-6 text-gray-400" />
                      </div>
                    ) : (
                      <Image
                        alt=""
                        className="object-cover"
                        fill
                        src={media.url}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- 右侧：信息与交互区域 --- */}
          <div className="pt-8 pl-4 lg:col-span-5">
            <h1 className="mb-2 font-serif text-5xl text-black italic leading-tight">
              {siteProduct.name}
            </h1>
            <p className="mb-6 font-serif text-gray-500 text-xl italic">
              {siteProduct.spuCode}
            </p>

            <div className="mb-8 font-light text-lg">
              Ref Price:{" "}
              <span className="font-medium text-black">
                {displayPrice > 0
                  ? `USD ${displayPrice.toFixed(2)}`
                  : "Contact for price"}
                {!selectedSku && skus.length > 1 && (
                  <span className="ml-1 text-gray-400 text-sm">起</span>
                )}
              </span>
            </div>

            {/* A. 特殊渲染：尺码选择器 (Tab + Select) */}
            {parsedSizeData && (
              <div className="mb-6">
                <span className="mb-2 block font-bold text-[10px] text-gray-500 uppercase tracking-widest">
                  {parsedSizeData.sizeKey}
                </span>
                {/* 地区 Tabs */}
                <div className="mb-3 flex gap-2">
                  {Object.keys(parsedSizeData.regionGroups).map((region) => (
                    <button
                      className={cn(
                        "border px-4 py-2 font-bold text-xs transition-colors",
                        activeSizeRegion === region
                          ? "border-black bg-black text-white"
                          : "border-gray-200 text-black hover:border-black"
                      )}
                      key={region}
                      onClick={() => {
                        setActiveSizeRegion(region);
                        // 切换地区时，清除当前选中的尺码，防止不匹配
                        handleSpecChange(parsedSizeData.sizeKey, "");
                      }}
                    >
                      {region}
                    </button>
                  ))}
                </div>
                {/* 尺码下拉框 */}
                <div className="relative w-full">
                  <select
                    className="w-full appearance-none border border-gray-200 bg-white px-4 py-3 pr-10 font-bold text-xs focus:border-black focus:outline-none"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) handleSpecChange(parsedSizeData.sizeKey, val);
                    }}
                    value={selectedSpecs[parsedSizeData.sizeKey] || ""}
                  >
                    <option value="">Select Size</option>
                    {(parsedSizeData.regionGroups[activeSizeRegion] || []).map(
                      (sizeNum) => {
                        // 构造组合值: "EU36"
                        const val = `${activeSizeRegion}${sizeNum}`;
                        return (
                          <option key={sizeNum} value={val}>
                            {sizeNum}
                          </option>
                        );
                      }
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
              </div>
            )}

            {/* B. 通用渲染：其他规格 (颜色等) */}
            {Object.entries(specOptions)
              .filter(([key]) =>
                parsedSizeData ? key !== parsedSizeData.sizeKey : true
              )
              .map(([key, values]) => (
                <div className="mb-6" key={key}>
                  <span className="mb-2 block font-bold text-[10px] text-gray-500 uppercase tracking-widest">
                    {key}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {values.map((val) => (
                      <button
                        className={cn(
                          "border px-4 py-2 font-bold text-xs transition-colors",
                          selectedSpecs[key] === val
                            ? "border-black bg-black text-white"
                            : "border-gray-200 text-black hover:border-black"
                        )}
                        key={val}
                        onClick={() => handleSpecChange(key, val)}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {/* 数量与支付方式 */}
            <div className="mb-8 space-y-6">
              {/* Quantity */}
              <div>
                <span className="mb-2 block font-bold text-[10px] text-gray-500 uppercase tracking-widest">
                  Quantity
                </span>
                <div className="flex w-32 items-center border border-gray-200">
                  <button
                    className="flex h-10 w-10 items-center justify-center hover:bg-gray-50"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="flex-1 text-center font-medium text-sm">
                    {quantity}
                  </div>
                  <button
                    className="flex h-10 w-10 items-center justify-center hover:bg-gray-50"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Payment */}
              <div className="relative">
                <span className="mb-2 block font-bold text-[10px] text-gray-500 uppercase tracking-widest">
                  Payment Terms
                </span>
                <select
                  className="w-full appearance-none border border-gray-200 bg-white px-4 py-3 pr-10 font-serif text-sm italic focus:border-black focus:outline-none"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  value={paymentMethod}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 bottom-3.5 h-4 w-4 text-gray-500" />
              </div>
            </div>

            <button
              className="w-full bg-black py-4 font-bold text-[11px] text-white uppercase tracking-[0.2em] transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              onClick={() => {
                if (!selectedSku) return alert("Please select all options");
                setShowInquiryForm(true);
              }}
            // 也可以选择在这里禁用按钮，或者允许点击后弹出提示
            // disabled={!selectedSku}
            >
              Request Availability
            </button>
          </div>
        </div>

        {/* --- 底部：详情 Tabs --- */}
        <div className="border-gray-200 border-t pt-12">
          <div className="mb-8 flex space-x-8 border-gray-100 border-b">
            {["description", "details"].map((tab) => (
              <button
                className={cn(
                  "pb-4 font-bold text-xs uppercase tracking-widest transition-colors",
                  activeTab === tab
                    ? "border-black border-b-2 text-black"
                    : "text-gray-400"
                )}
                key={tab}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="font-serif text-lg text-gray-800 leading-relaxed">
            {activeTab === "description" ? (
              <div style={{ whiteSpace: "pre-line" }}>
                {siteProduct.description}
              </div>
            ) : (
              <div className="font-serif text-lg text-gray-800 space-y-6">
                {/* 基础信息 */}
                <div className="space-y-4">
                  {/* <p>
                    <span className="mr-4 font-bold font-sans text-[10px] uppercase">
                      SPU Code
                    </span>{" "}
                    {siteProduct.spuCode}
                  </p> */}
                  <p>
                    <span className="mr-4  font-serif text-lg uppercase">
                      Categories
                    </span>
                    {siteProduct.categories?.map((c) => c.name).join(", ")}
                  </p>
                </div>

                {/* 自定义属性 */}
                {siteProduct.customAttributes &&
                  Object.keys(siteProduct.customAttributes).length > 0 && (
                    <div className="border-gray-100 border-t pt-6">
                      <h4 className="mb-4 font-bold text-gray-900 text-sm uppercase tracking-wider">
                        Attributes
                      </h4>
                      <CustomAttributesSection
                        customAttributes={siteProduct.customAttributes}
                      />
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Modal: 询盘表单 --- */}
      {showInquiryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="no-scrollbar relative max-h-[90vh] w-full max-w-md overflow-y-auto bg-white p-8 shadow-2xl">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-black"
              onClick={() => setShowInquiryForm(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6 text-center">
              <h3 className="mb-2 font-serif text-3xl italic">Request Quote</h3>
              <p className="text-gray-500 text-xs">{siteProduct.name}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {Object.entries(selectedSpecs).map(([k, v]) => (
                  <span
                    className="border border-gray-200 bg-gray-100 px-2 py-1 font-bold text-[10px] text-gray-600 uppercase"
                    key={k}
                  >
                    {k}: {v}
                  </span>
                ))}
              </div>
            </div>
            {submitSuccess ? (
              <SuccessView />
            ) : (
              <InquiryForm
                defaultValues={
                  typeof window !== "undefined"
                    ? JSON.parse(localStorage.getItem("gina_user_info") || "{}")
                    : {}
                }
                onSubmit={handleInquirySubmit}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
