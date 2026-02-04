/**
 * Excel生成服务
 * 基于模板生成报价单Excel文件
 */

import fs, { promises as fsPromises } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { HttpError } from "@pori15/logixlysia";
// main.js
import ExcelJS from "exceljs";
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
            return dataValue !== null && dataValue !== undefined ? String(dataValue) : "";
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
            return dataValue !== null && dataValue !== undefined ? String(dataValue) : "";
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
  if (quotationData.photoForRefer) {
    const { buffer, mimeType, name } = quotationData.photoForRefer;

    console.log("[Excel] 开始处理图片:", { name, mimeType, bufferSize: buffer.length });

    // 图片位置：K6 到 L22（17行）
    const startRow = 6; // K6
    const endRow = 22;  // L22
    const totalRows = endRow - startRow + 1; // 17 行

    const targetCellAddr = "K6";

    // 获取目标单元格的位置
    const targetCell = worksheet.getCell(targetCellAddr);
    const col = typeof targetCell.col === 'number' ? targetCell.col : parseInt(targetCell.col as string, 10);
    const row = typeof targetCell.row === 'number' ? targetCell.row : parseInt(targetCell.row as string, 10);

    // 计算 K 到 L 列的总像素宽度（作为旋转后图片的目标高度）
    const kColWidth = worksheet.getColumn(11).width || 10; // K列
    const lColWidth = worksheet.getColumn(12).width || 10; // L列
    const targetImageHeightPx = (kColWidth + lColWidth) * 7.5; // K+L列的总宽度（像素）

    // 缩小 1/4
    const scaledImageHeightPx = targetImageHeightPx / 4;

    console.log("[Excel] 目标图片高度（K+L列宽）:", {
      kColWidth,
      lColWidth,
      targetImageHeightPx,
      scaledImageHeightPx,
    });

    // 调整从 K6 到 K22 的所有行高
    for (let r = startRow;r <= endRow;r++) {
      worksheet.getRow(r).height = scaledImageHeightPx * 0.75 / totalRows;
    }

    // 处理图片旋转并调整尺寸
    let imageBuffer = Buffer.from(buffer);
    let finalWidth = 200;
    let finalHeight = scaledImageHeightPx;

    try {
      // 获取原始图片元数据
      const metadata = await sharp(buffer).metadata();
      console.log("[Excel] 原始图片尺寸:", { width: metadata.width, height: metadata.height });

      if (metadata.width && metadata.height) {
        // 旋转后宽高互换
        const rotatedWidth = metadata.height;
        const rotatedHeight = metadata.width;

        // 计算自适应宽度：保持旋转后的比例，缩小 1/3
        const ratio = scaledImageHeightPx / rotatedHeight;
        finalWidth = rotatedWidth * ratio;
        finalHeight = scaledImageHeightPx;

        console.log("[Excel] 图片旋转并调整尺寸（缩小1/3）:", {
          rotatedWidth,
          rotatedHeight,
          ratio,
          finalWidth,
          finalHeight,
        });

        // 旋转图片并缩放
        const rotatedBuffer = await sharp(buffer)
          .rotate(90)
          .resize(Math.round(finalWidth), Math.round(finalHeight))
          .toBuffer();
        imageBuffer = Buffer.from(rotatedBuffer);
      }
    } catch (error) {
      console.error("[Excel] 图片处理失败，使用原始图片:", error);
    }

    // 将图片添加到 workbook
    const imageId = workbook.addImage({
      buffer: imageBuffer as any,
      extension: mimeType.split("/")[1] as "png" | "jpeg" | "gif",
    });

    console.log("[Excel] 图片已添加到 workbook，imageId:", imageId);

    // 插入图片到 K6 位置，跨越到 L22
    worksheet.addImage(imageId, {
      tl: {
        col: col - 1, // K列（索引从0开始）
        row: row - 1,  // 第6行
      },
      ext: {
        width: finalWidth,     // L列
        height: finalHeight,  // 第22行
      },
      editAs: "oneCell",
    });

    console.log("[Excel] 图片插入完成，位置: K6-L22, 尺寸:", { width: finalWidth, height: finalHeight });
  }

  // 4. 生成并返回 Buffer（注意：这必须在 all rows 处理完之后！）
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
