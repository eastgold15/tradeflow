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
// 1. 工具函数
// ----------------------------------------------------------------------

const PAYMENT_METHODS = [
  "Cash on Delivery",
  "30% Deposit, Balance against B/L",
  "L/C at 30 days sight",
];

const getActualMediaType = (media: { mediaType?: string; url: string }): "video" | "image" => {
  const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".avi", ".mkv"];
  if (VIDEO_EXTENSIONS.some((ext) => media.url?.toLowerCase().endsWith(ext))) return "video";
  return (media.mediaType as "video" | "image") || "image";
};

/**
 * 🔥 核心逻辑：根据后端给定的有序 ID 列表进行渲染排序
 * 规则：严格遵守 targetMediaIds 的索引顺序，但视频强制置底
 */
const sortMediaByList = (allMedia: any[], targetMediaIds: string[]) => {
  if (!targetMediaIds || targetMediaIds.length === 0) return [];

  // 1. 过滤：从全量池中找出当前 SKU 拥有的媒体
  const filtered = allMedia.filter((m) => targetMediaIds.includes(m.id));

  // 2. 排序：基于 targetMediaIds 的位置
  return [...filtered].sort((a, b) => {
    const aIsVideo = getActualMediaType(a) === "video";
    const bIsVideo = getActualMediaType(b) === "video";

    // 视频永远放在最后
    if (aIsVideo && !bIsVideo) return 1;
    if (!aIsVideo && bIsVideo) return -1;

    // 图片顺序遵循后端数组下标 (后端已处理好 sortOrder:0)
    return targetMediaIds.indexOf(a.id) - targetMediaIds.indexOf(b.id);
  });
};

const parseSizeVariants = (specOptions: Record<string, string[]>) => {
  const sizeKey = Object.keys(specOptions).find((k) => k.toLowerCase().includes("size"));
  if (!sizeKey) return null;

  const sizeValues = specOptions[sizeKey] || [];
  const regionGroups: Record<string, string[]> = { EU: [], UK: [], US: [] };

  sizeValues.forEach((value) => {
    const parts = value.split(",").map((p) => p.trim());
    const hasMultiRegion = parts.length > 1 && parts.every((p) => /^(EU|UK|US)\d+(\.\d+)?$/.test(p));

    if (hasMultiRegion) {
      parts.forEach((part) => {
        const match = part.match(/^(EU|UK|US)(\d+(\.\d+)?)$/);
        if (match) regionGroups[match[1]].push(match[2]);
      });
    } else {
      const match = value.match(/^(EU|UK|US)?(\d+(\.\d+)?)$/);
      if (match) {
        const region = match[1] || "EU";
        const size = match[2];
        if (!regionGroups[region]) regionGroups[region] = [];
        regionGroups[region].push(size);
      }
    }
  });

  Object.keys(regionGroups).forEach((region) => {
    regionGroups[region] = [...new Set(regionGroups[region])].sort(
      (a, b) => Number.parseFloat(a) - Number.parseFloat(b)
    );
  });

  return { sizeKey, regionGroups: Object.fromEntries(Object.entries(regionGroups).filter(([_, v]) => v.length > 0)) };
};

// ----------------------------------------------------------------------
// 2. 子组件
// ----------------------------------------------------------------------
const CustomAttributesSection = ({ customAttributes }: { customAttributes?: Record<string, string> }) => {
  if (!customAttributes || Object.keys(customAttributes).length === 0) return null;
  return (
    <div className="space-y-4">
      {Object.entries(customAttributes).map(([key, value]) => {
        if (key.toLowerCase() === "details" && value.includes(";")) {
          const detailItems = value.split(";").map((item) => item.trim()).filter(Boolean);
          return (
            <div key={key}>
              <ul className="ml-6 list-disc space-y-1">
                {detailItems.map((item, idx) => (
                  <li className="font-serif text-gray-800 text-lg" key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <p key={key}>
            <span className="mr-4 font-bold font-sans text-[10px] uppercase">{key}</span>
            <span className="font-serif text-gray-800 text-lg">{value}</span>
          </p>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------------
// 3. 主组件
// ----------------------------------------------------------------------
interface ProductDetailProps {
  siteProduct: ProductDetailRes;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ siteProduct }) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "details">("description");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [activeSizeRegion, setActiveSizeRegion] = useState<string>("EU");

  const inquiryMutation = useCreateInquiry();

  const skus = useMemo(() => siteProduct.skus || [], [siteProduct]);
  const allMedia = useMemo(() => siteProduct.gallery || [], [siteProduct]);
  const colorAttributeKey = siteProduct.colorAttributeKey;

  const specOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    skus.forEach((sku) => {
      const specJson = (sku.specJson as Record<string, string>) || {};
      Object.entries(specJson).forEach(([key, value]) => {
        if (!options[key]) options[key] = new Set();
        options[key].add(value);
      });
    });
    return Object.fromEntries(Object.entries(options).map(([key, values]) => [key, Array.from(values)]));
  }, [skus]);

  const parsedSizeData = useMemo(() => parseSizeVariants(specOptions), [specOptions]);

  // 初始化默认值
  const isInitialized = useRef(false);
  useEffect(() => {
    if (!isInitialized.current && skus.length > 0) {
      if (parsedSizeData) {
        setActiveSizeRegion(Object.keys(parsedSizeData.regionGroups)[0] || "EU");
      }
      // 默认选中第一个 SKU 的规格，或者第一个颜色的规格
      const firstSkuSpecs = skus[0].specJson as Record<string, string>;
      setSelectedSpecs(firstSkuSpecs);
      isInitialized.current = true;
    }
  }, [skus, parsedSizeData]);

  // 🔥 核心计算：根据当前选中的规格匹配 SKU 并获取排序后的媒体列表
  const currentSku = useMemo(() => {
    return skus.find((sku) => {
      const specJson = (sku.specJson as Record<string, string>) || {};
      return Object.entries(selectedSpecs).every(([key, value]) => {
        if (key === parsedSizeData?.sizeKey) return specJson[key].includes(value);
        return specJson[key] === value;
      });
    });
  }, [skus, selectedSpecs, parsedSizeData]);

  const displayGallery = useMemo(() => {
    // 如果匹配到了 SKU，使用 SKU 的 mediaIds；否则使用全量 Gallery
    const targetIds = currentSku?.mediaIds || allMedia.map(m => m.id);
    return sortMediaByList(allMedia, targetIds);
  }, [allMedia, currentSku]);

  // 切换规格逻辑
  const handleSpecChange = (key: string, value: string) => {
    setSelectedSpecs((prev) => {
      if (prev[key] === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    setActiveMediaIndex(0); // 切换规格时，图片重置到第一张（主图）
  };

  const handleInquirySubmit = async (values: InquiryFormValues) => {
    if (!currentSku) return alert("Please select all options.");
    try {
      const { remarks, ...contactInfo } = values;
      localStorage.setItem("gina_user_info", JSON.stringify(contactInfo));
      await inquiryMutation.mutateAsync({
        siteProductId: siteProduct.id,
        siteSkuId: currentSku.id,
        skuMediaId: currentSku.mediaIds?.[0] || "",
        productName: siteProduct.name,
        productDescription: siteProduct.description || "",
        paymentMethod,
        customerRequirements: remarks || "",
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

  const currentMedia = displayGallery[activeMediaIndex];

  return (
    <div className="min-h-screen bg-white pt-16 pb-16">
      <div className="mx-auto max-w-325 px-6">
        <div className="mb-24 grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* 左侧：画廊区域 */}
          <div className="flex flex-col items-center lg:col-span-7">
            <div className="group relative mb-8 aspect-4/3 w-full overflow-hidden bg-gray-50">
              {displayGallery.length > 1 && (
                <>
                  <button
                    className="absolute top-1/2 left-0 z-10 -translate-y-1/2 p-4 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setActiveMediaIndex((p) => (p - 1 + displayGallery.length) % displayGallery.length)}
                  >
                    <ChevronLeft className="h-8 w-8 text-gray-400 hover:text-black" />
                  </button>
                  <button
                    className="absolute top-1/2 right-0 z-10 -translate-y-1/2 p-4 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => setActiveMediaIndex((p) => (p + 1) % displayGallery.length)}
                  >
                    <ChevronRight className="h-8 w-8 text-gray-400 hover:text-black" />
                  </button>
                </>
              )}

              {currentMedia && (
                getActualMediaType(currentMedia) === "video" ? (
                  <video
                    autoPlay controls loop muted
                    className="h-full w-full object-contain mix-blend-multiply"
                    key={currentMedia.url}
                    src={currentMedia.url}
                  />
                ) : (
                  <Image
                    alt={siteProduct.name}
                    className="object-contain mix-blend-multiply"
                    fill priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    src={currentMedia.url}
                  />
                )
              )}
            </div>

            {/* 缩略图列表 */}
            <div className="no-scrollbar flex max-w-full space-x-4 overflow-x-auto pb-2">
              {displayGallery.map((media, idx) => (
                <button
                  className={cn(
                    "relative h-20 w-20 shrink-0 overflow-hidden rounded border-2 transition-all",
                    activeMediaIndex === idx ? "border-black shadow-lg" : "border-gray-200 hover:border-gray-400"
                  )}
                  key={`${media.id}-${idx}`}
                  onClick={() => setActiveMediaIndex(idx)}
                >
                  {getActualMediaType(media) === "video" ? (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100">
                      <Play className="h-6 w-6 text-gray-400" />
                    </div>
                  ) : (
                    <Image alt="" className="object-cover" fill src={media.url} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 右侧：信息区域 */}
          <div className="pt-8 pl-4 lg:col-span-5">
            <h1 className="mb-2 font-serif text-5xl text-black italic leading-tight">{siteProduct.name}</h1>

            <div className="mb-8 font-light text-lg">
              RETAIL PRICE:{" "}
              <span className="font-medium text-black">
                {currentSku ? `USD ${Number(currentSku.price).toFixed(2)}` : "Select options for price"}
              </span>
            </div>

            {/* 尺码选择器 */}
            {parsedSizeData && (
              <div className="mb-6">
                <span className="mb-2 block font-bold text-[10px] text-gray-500 uppercase tracking-widest">{parsedSizeData.sizeKey}</span>
                <div className="mb-3 flex gap-2">
                  {Object.keys(parsedSizeData.regionGroups).map((region) => (
                    <button
                      className={cn(
                        "border px-4 py-2 font-bold text-xs transition-colors",
                        activeSizeRegion === region ? "border-black bg-black text-white" : "border-gray-200 text-black hover:border-black"
                      )}
                      key={region}
                      onClick={() => {
                        setActiveSizeRegion(region);
                        handleSpecChange(parsedSizeData.sizeKey, "");
                      }}
                    >
                      {region}
                    </button>
                  ))}
                </div>
                <div className="relative w-full">
                  <select
                    className="w-full appearance-none border border-gray-200 bg-white px-4 py-3 pr-10 font-bold text-xs focus:border-black focus:outline-none"
                    onChange={(e) => handleSpecChange(parsedSizeData.sizeKey, e.target.value)}
                    value={selectedSpecs[parsedSizeData.sizeKey] || ""}
                  >
                    <option value="">Select Size</option>
                    {(parsedSizeData.regionGroups[activeSizeRegion] || []).map((sizeNum) => (
                      <option key={sizeNum} value={`${activeSizeRegion}${sizeNum}`}>{sizeNum}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
              </div>
            )}

            {/* 通用规格选择器 */}
            {Object.entries(specOptions)
              .filter(([key]) => parsedSizeData ? key !== parsedSizeData.sizeKey : true)
              .map(([key, values]) => (
                <div className="mb-6" key={key}>
                  <span className="mb-2 block font-bold text-[10px] text-gray-500 uppercase tracking-widest">{key}</span>
                  <div className="flex flex-wrap gap-2">
                    {values.map((val) => (
                      <button
                        className={cn(
                          "border px-4 py-2 font-bold text-xs transition-colors",
                          selectedSpecs[key] === val ? "border-black bg-black text-white" : "border-gray-200 text-black hover:border-black"
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

            {/* 数量与支付 */}
            <div className="mb-8 space-y-6">
              <div>

                <div className="flex justify-between items-center">

                  <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">Quantity</span>

                  <span className="text-gray-500 font-bold text-[10px]  tracking-widest"></span>
                </div>
                <div className="flex items-center gap-2 border border-gray-200 px-2 py-1">
                  <button className="flex h-10 w-10 items-center justify-center hover:bg-gray-50 transition-colors" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <Minus className="h-4 w-4 text-gray-600" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1) {
                        setQuantity(val);
                      } else if (e.target.value === "") {
                        setQuantity(1);
                      }
                    }}
                    className="flex-1 min-w-20 border-x border-gray-200 px-3 py-2 text-center font-medium text-sm focus:border-black focus:border-2 focus:ring-2 focus:ring-black/5 "
                  />
                  <button className="flex h-10 w-10 items-center justify-center hover:bg-gray-50 transition-colors" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="mb-2 block font-bold text-[10px] text-gray-500 uppercase tracking-widest">Payment Terms</span>
                <select
                  className="w-full appearance-none border border-gray-200 bg-white px-4 py-3 pr-10 font-serif text-sm italic focus:border-black focus:outline-none"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  value={paymentMethod}
                >
                  <option value="" disabled>Choose payment term</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 bottom-3.5 h-4 w-4 text-gray-500" />
              </div>
            </div>

            <p className="text-center text-gray-500 tracking-widest font-bold text-lg">
              Please choose QTY & Payment term
            </p>
            <p className="text-gray-500  tracking-widest  text-sm text-center">push below button for <b className="font-bold text text-lg"> discount wholesale offer</b></p>


            <button
              className="w-full bg-black py-4 font-bold text-[11px] text-white uppercase tracking-[0.2em] transition-colors hover:bg-gray-800"
              onClick={() => {
                if (!currentSku) return alert("Please select all options");
                setShowInquiryForm(true);
              }}
            >
              Request Availability
            </button>
          </div>
        </div>

        {/* 底部 Tabs */}
        <div className="border-gray-200 border-t pt-12">
          <div className="mb-8 flex space-x-8 border-gray-100 border-b">
            {["description", "details"].map((tab) => (
              <button
                className={cn(
                  "pb-4 font-bold text-xs uppercase tracking-widest transition-colors",
                  activeTab === tab ? "border-black border-b-2 text-black" : "text-gray-400"
                )}
                key={tab}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="font-serif text-gray-800 text-lg leading-relaxed">
            {activeTab === "description" ? (
              <div style={{ whiteSpace: "pre-line" }}>{siteProduct.description}</div>
            ) : (
              <div className="space-y-6">
                <p><span className="mr-4 font-serif uppercase">Categories</span>{siteProduct.categories?.map((c) => c.name).join(", ")}</p>
                {siteProduct.customAttributes && (
                  <div className="border-gray-100 border-t pt-6">
                    <h4 className="mb-4 font-bold text-gray-900 text-sm uppercase tracking-wider">Attributes</h4>
                    <CustomAttributesSection customAttributes={siteProduct.customAttributes} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Inquiry Form */}
      {showInquiryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="no-scrollbar relative max-h-[90vh] w-full max-w-md overflow-y-auto bg-white p-8 shadow-2xl">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-black" onClick={() => setShowInquiryForm(false)}><X className="h-5 w-5" /></button>
            <div className="mb-6 text-center">
              <h3 className="mb-2 font-serif text-3xl italic">Request Quote</h3>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {Object.entries(selectedSpecs).map(([k, v]) => (
                  <span className="border border-gray-200 bg-gray-100 px-2 py-1 font-bold text-[10px] text-gray-600 uppercase" key={k}>{k}: {v}</span>
                ))}
              </div>
            </div>
            {submitSuccess ? <SuccessView /> : (
              <InquiryForm
                defaultValues={typeof window !== "undefined" ? JSON.parse(localStorage.getItem("gina_user_info") || "{}") : {}}
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