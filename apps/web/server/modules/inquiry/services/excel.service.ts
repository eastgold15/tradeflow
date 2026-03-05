/**
 * Excel生成服务
 * 基于模板生成报价单Excel文件
 */

import fs, { promises as fsPromises } from "node:fs";
import path from "node:path";
import { HttpError } from "@pori15/logixlysia";
// main.js
import ExcelJS from "exceljs";
import sharp from "sharp";
import type { QuotationData } from "../excelTemplate/QuotationData";

// Excel模板路径 - 修复 Next.js 环境下的路径问题
const projectRoot = process.cwd(); // 标准化路径并检查是否已经包含 apps/web（兼容 Windows 和 Unix 路径）
const normalizedPath = path.normalize(projectRoot).replace(/\\/g, "/");

// 根据当前工作目录动态生成模板路径
const getTemplatePath = () => {
  if (normalizedPath.includes("apps/web")) {
    // 如果当前工作目录已经在 apps/web 下，不需要再添加 apps/web
    return path.resolve(
      projectRoot,
      "server",
      "modules",
      "inquiry",
      "excelTemplate",
      "inquiry.xlsx"
    );
  }
  // 否则假设从项目根目录开始
  return path.resolve(
    projectRoot,
    "apps",
    "web",
    "server",
    "modules",
    "inquiry",
    "excelTemplate",
    "inquiry.xlsx"
  );
};

export const TEMPLATE_PATH = getTemplatePath();
/**
 * 生成报价单 Excel 文件
 */
export async function generateQuotationExcel(quotationData: QuotationData) {
  // 1. 检查模板是否存在
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new HttpError.NotFound(`模板不存在: ${TEMPLATE_PATH}`);
  }

  console.log("✅ 模板存在");
  const stats = await fsPromises.stat(TEMPLATE_PATH);
  console.log("📏 文件大小:", stats.size, "字节");

  // 2. 加载 Excel 模板
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);

  console.log("📊 工作簿加载完成");
  console.log("📄 工作表数量:", workbook.worksheets.length);
  console.log(
    "📛 工作表名称:",
    workbook.worksheets.map((ws) => ws.name)
  );

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new HttpError.BadGateway("❌ 无法获取工作表！");
  }
  console.log("✅ 成功获取工作表:", worksheet.name);

  // 定义超链接单元格类型（可选，增强可读性）
  interface HyperlinkCell {
    text: string;
    hyperlink: string;
  }

  // 替换正则（建议提出来复用）
  const replaceRegex = /\{\{(\w+)\}\}/g;

  // 🔧 需要跳过的字段（对象类型，不应该转换为字符串）
  const SKIP_FIELDS = ["photoForRefer"];

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      // 情况 1: 纯字符串
      if (typeof cell.value === "string") {
        const newValue = cell.value.replace(
          replaceRegex,
          (match, fieldName) => {
            // 🔧 跳过对象类型的字段
            if (SKIP_FIELDS.includes(fieldName)) {
              return match; // 保持原样，不替换
            }
            const dataValue = quotationData[fieldName as keyof QuotationData];
            return dataValue !== null && dataValue !== undefined
              ? String(dataValue)
              : "";
          }
        );
        cell.value = newValue;
      }
      // 情况 2: 超链接对象（如 { text: "...", hyperlink: "..." }）
      else if (
        cell.value &&
        typeof cell.value === "object" &&
        "text" in cell.value
      ) {
        const original = cell.value as Partial<HyperlinkCell>;
        const originalText = String(original.text); // 确保是字符串

        // 先对 text 做纯文本替换（得到新文本）
        const newText = originalText.replace(
          replaceRegex,
          (match, fieldName) => {
            // 🔧 跳过对象类型的字段
            if (SKIP_FIELDS.includes(fieldName)) {
              return match; // 保持原样，不替换
            }
            const dataValue = quotationData[fieldName as keyof QuotationData];
            return dataValue !== null && dataValue !== undefined
              ? String(dataValue)
              : "";
          }
        );

        // 再根据字段名决定是否更新 hyperlink
        let newHyperlink = original.hyperlink || "";

        const LINK_FIELD_MAP: Record<string, (value: string) => string> = {
          exporterWeb: (v) => `http://${v}`,
          factoryWeb: (v) => `http://${v}`,
          exporterEmail: (v) => `mailto:${v}`,
          factoryEmail: (v) => `mailto:${v}`,
          exporterPhone: (v) => `tel:${v}`,
        };
        // 检查原始 text 中包含哪些占位符
        for (const [fieldName, makeLink] of Object.entries(LINK_FIELD_MAP)) {
          if (originalText.includes(`{{${fieldName}}}`)) {
            newHyperlink = makeLink(newText);
            break; // 假设一个单元格只含一种占位符
          }
        }
        // 写回新的超链接对象
        cell.value = {
          text: newText,
          hyperlink: newHyperlink,
        };
      }
    });
  });

  //

  // === 第二步：处理图片 ===
  // 优化方案：以宽度为准，等比缩放，自动平摊行高
  if (quotationData.photoForRefer) {
    const { buffer, mimeType } = quotationData.photoForRefer;

    console.log("[Excel] 开始处理图片:", {
      mimeType,
      bufferSize: buffer.length,
    });

    // 1. 获取图片原始尺寸 (不手动旋转，但使用 .rotate() 自动纠正 EXIF 转向错误)
    const img = sharp(buffer).rotate();
    const metadata = await img.metadata();
    const originalWidth = metadata.width ?? 500;
    const originalHeight = metadata.height ?? 500;

    console.log("[Excel] 原始图片尺寸:", {
      width: originalWidth,
      height: originalHeight,
    });

    // 2. 计算 K+L 列的总像素宽度
    // ExcelJS 列宽 1 单位约等于 7.5 像素 (具体受字体影响，这里取通用值)
    const kColWidth = worksheet.getColumn(11).width || 12;
    const lColWidth = worksheet.getColumn(12).width || 12;
    const targetWidthPx = (kColWidth + lColWidth) * 7.5;

    // 3. 根据【宽度基准】计算等比例高度
    const scaleRatio = targetWidthPx / originalWidth;
    const targetHeightPx = originalHeight * scaleRatio;

    // 4. 处理行高：将 targetHeightPx 平摊到 6-22 行 (17行)
    // 转换 px 为磅 (pt): 1px = 0.75pt
    const targetHeightPt = targetHeightPx * 0.75;
    const startRow = 6;
    const endRow = 22;
    const totalRows = endRow - startRow + 1;
    const avgRowHeight = targetHeightPt / totalRows;

    // 动态调整行高，防止图片溢出
    for (let r = startRow; r <= endRow; r++) {
      // 如果计算出的行高太小（比如小于 15pt），建议设个最小值保证表格可看
      worksheet.getRow(r).height = Math.max(avgRowHeight, 15);
    }

    console.log("[Excel] 目标尺寸:", {
      targetWidthPx,
      targetHeightPx,
      avgRowHeight,
    });

    // 5. 调整图片并生成 Buffer
    const processedBuffer = await img
      .resize({
        width: Math.round(targetWidthPx),
        height: Math.round(targetHeightPx),
        fit: "contain",
      })
      .toBuffer();

    // 6. 添加到 Workbook
    const imageId = workbook.addImage({
      buffer: processedBuffer as any,
      extension: (mimeType.split("/")[1] as any) || "jpeg",
    });

    console.log("[Excel] 图片已添加到 workbook，imageId:", imageId);

    // 7. 插入图片
    worksheet.addImage(imageId, {
      tl: { col: 10, row: startRow - 1 }, // K6 单元格 (索引从0开始)
      ext: {
        width: targetWidthPx,
        height: targetHeightPx,
      },
      editAs: "oneCell", // 图片位置随单元格移动但不随之拉伸
    });

    console.log(
      `[Excel] 图片处理完成: 宽度基准=${targetWidthPx}px, 计算高度=${targetHeightPx.toFixed(2)}px`
    );
  }

  // 4. 生成并返回 Buffer（注意：这必须在 all rows 处理完之后！）
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
