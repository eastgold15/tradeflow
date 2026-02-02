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

    // 1. 先找到并清除图片占位符（在添加图片之前）
    let targetCellAddr = "K9"; // 默认位置
    let photoFound = false;
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === "{{PHOTO_PLACEHOLDER}}") {
          targetCellAddr = cell.address; // 如 "D5"
          cell.value = ""; // 清空占位符
          photoFound = true;
        }
      });
    });

    console.log("[Excel] 图片占位符已清除，位置:", targetCellAddr, "找到占位符:", photoFound);

    // 2. 获取目标单元格的位置
    const targetCell = worksheet.getCell(targetCellAddr);
    const col = typeof targetCell.col === 'number' ? targetCell.col : parseInt(targetCell.col as string, 10);
    const row = typeof targetCell.row === 'number' ? targetCell.row : parseInt(targetCell.row as string, 10);

    // 3. 计算 K 到 L 列的总像素宽度（作为旋转后图片的目标高度）
    const kColWidth = worksheet.getColumn(11).width || 10; // K列
    const lColWidth = worksheet.getColumn(12).width || 10; // L列
    const targetImageHeightPx = (kColWidth + lColWidth) * 7.5; // K9:L9的总宽度（像素）

    console.log("[Excel] 目标图片高度（K+L列宽）:", {
      kColWidth,
      lColWidth,
      targetImageHeightPx,
    });

    // 4. 调整行高，确保单元格能放下这个高度
    // 行高单位是点（point），1 inch = 72 points，约等于 像素 * 0.75
    worksheet.getRow(row).height = targetImageHeightPx * 0.75;

    // 5. 处理图片旋转并获取自适应宽度
    let imageBuffer = Buffer.from(buffer);
    let finalWidth = 200; // 默认占位
    let finalHeight = targetImageHeightPx;

    try {
      // 获取原始图片元数据
      const metadata = await sharp(buffer).metadata();
      console.log("[Excel] 原始图片尺寸:", { width: metadata.width, height: metadata.height });

      if (metadata.width && metadata.height) {
        // 旋转后宽高互换
        const rotatedWidth = metadata.height;
        const rotatedHeight = metadata.width;

        // 计算自适应宽度：保持旋转后的比例
        // 公式：(目标高度 / 旋转后原始高度) * 旋转后原始宽度
        const ratio = targetImageHeightPx / rotatedHeight;
        finalWidth = rotatedWidth * ratio;
        finalHeight = targetImageHeightPx;

        console.log("[Excel] 图片旋转并调整尺寸:", {
          rotatedWidth,
          rotatedHeight,
          ratio,
          finalWidth,
          finalHeight,
        });

        // 旋转图片
        const rotatedBuffer = await sharp(buffer).rotate(90).toBuffer();
        imageBuffer = Buffer.from(rotatedBuffer);
      }
    } catch (error) {
      console.error("[Excel] 图片处理失败，使用原始图片:", error);
    }

    // 6. 将图片添加到 workbook
    const imageId = workbook.addImage({
      buffer: imageBuffer as any,
      extension: mimeType.split("/")[1] as "png" | "jpeg" | "gif",
    });

    console.log("[Excel] 图片已添加到 workbook，imageId:", imageId);

    // 7. 插入图片
    worksheet.addImage(imageId, {
      tl: {
        col: col - 1, // 列索引从 0 开始，所以要 -1
        row: row - 1,  // 行索引从 0 开始，所以要 -1
      },
      ext: {
        width: finalWidth,            // 宽度根据比例自适应
        height: finalHeight,          // 高度等于 K9 到 L9 的宽度
      },
      editAs: "oneCell", // 图片随单元格移动/缩放
    });

    console.log("[Excel] 图片插入完成，位置:", targetCellAddr, "尺寸:", { width: finalWidth, height: finalHeight });
  }

  // 4. 生成并返回 Buffer（注意：这必须在 all rows 处理完之后！）
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
