/**
 * Excel生成服务
 * 基于模板生成报价单Excel文件
 */

import fs, { promises as fsPromises } from "node:fs";
import path from "node:path";
import { HttpError } from "@pori15/elysia-unified-error";
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

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      // 情况 1: 纯字符串
      if (typeof cell.value === "string") {
        const newValue = cell.value.replace(
          replaceRegex,
          (match, fieldName) => {
            const dataValue = quotationData[fieldName as keyof QuotationData];
            return dataValue !== null ? String(dataValue) : "";
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
            const dataValue = quotationData[fieldName as keyof QuotationData];
            return dataValue !== null ? String(dataValue) : "";
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

    // 1. 将图片添加到 workbook（返回 imageId）
    const imageId = workbook.addImage({
      buffer: Buffer.from(buffer) as any,
      extension: mimeType.split("/")[1] as "png" | "jpeg" | "gif",
    });

    // 2. 找到图片应插入的位置（例如：模板中 K9 单元格写 {{PHOTO_PLACEHOLDER}}）
    let targetCellAddr = "K9"; // 默认位置
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value === "{{PHOTO_PLACEHOLDER}}") {
          targetCellAddr = cell.address; // 如 "D5"
          // 可选：清空占位符
          cell.value = "";
        }
      });
    });

    // 3. 插入图片（覆盖目标单元格区域）
    worksheet.addImage(imageId, {
      tl: {
        col: 11,
        row: 9,
      },
      ext: {
        width: Number(worksheet.getCell(targetCellAddr).col),
        height: Number(worksheet.getCell(targetCellAddr).row),
      },
      editAs: "oneCell", // 图片随单元格移动/缩放
    });
  }

  // 4. 生成并返回 Buffer（注意：这必须在 all rows 处理完之后！）
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
