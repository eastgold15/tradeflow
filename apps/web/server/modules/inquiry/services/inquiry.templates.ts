/**
 * 询价模块邮件模板
 * 处理询价确认、询价通知等业务相关的邮件模板
 */

import type { InquiryWithItems } from "~/service/inquiry.service";
import { EmailTemplate, EmailAttachment } from "~/utils/email/email.types";

// 🔧 从邮箱前缀提取客户名称
const extractUsernameFromEmail = (email: string): string => {
  if (!email) return "";
  const match = email.match(/^([^@]+)@/);
  return match ? match[1] : "";
};
/**
 * 创建客户确认邮件模板
 */
export function createCustomerInquiryTemplate(
  inquiryData: {
    id: string;
    customerName: string;
    companyName?: string;
    email: string;
    phone?: string;
    whatsapp?: string;
    status: string;
    createdAt: Date;
    notes?: string;
  },
  inquiryNumber: string,
  productName: string
): EmailTemplate {


  const displayName = extractUsernameFromEmail(inquiryData.email);

  const subject = `询价确认 - ${inquiryNumber} - DONG QI FOOTWEAR`;

  const text = `尊敬的${displayName}，感谢您对${productName}的询价！您的询价单号：${inquiryNumber}。我们已收到您的询价，将在24小时内与您联系。`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>询价确认</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- 头部 -->
        <div style="background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">询价确认</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">感谢您的垂询</p>
        </div>

        <!-- 内容 -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
            尊敬的 <strong>${displayName}</strong>，您好！
          </p>

          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
            感谢您对 <strong style="color: #4ca1af;">${productName}</strong> 的询价！我们已收到您的询价请求，询价单号：
          </p>

          <!-- 询价单号 -->
          <div style="background-color: #f8f9fa; border-left: 4px solid #4ca1af; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #2c3e50;">
              询价单号：${inquiryNumber}
            </p>
          </div>

          <!-- 询价信息 -->
          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 4px; margin: 30px 0;">
            <h3 style="margin-top: 0; color: #2c3e50; font-size: 16px;">询价信息摘要：</h3>
            <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
              <li>询价产品：${productName}</li>
              <li>公司名称：${inquiryData.companyName || "-"}</li>
              <li>联系电话：${inquiryData.phone || "-"}</li>
              <li>WhatsApp：${inquiryData.whatsapp || "-"}</li>
              <li>询价时间：${inquiryData.createdAt.toLocaleString("zh-CN")}</li>
            </ul>
          </div>

          <!-- 处理时间 -->
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 15px;">
              <strong>⏰ 处理时效：</strong>我们将在 <strong>24小时内</strong> 处理您的询价，并通过邮件或电话与您联系。
            </p>
          </div>

          <!-- 公司信息 -->
          <div style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 40px;">
            <h4 style="color: #2c3e50; font-size: 16px; margin-bottom: 15px;">DONG QI FOOTWEAR INTL MFG CO., LTD</h4>
            <p style="color: #666; font-size: 14px; line-height: 1.8; margin: 0;">
              📍 No.2 Chiling Road, Chiling Industrial Zone, Houjie, Dongguan, Guangdong, China<br>
              🌐 www.dongqifootwear.com<br>
              📧 sales@dongqifootwear.com
            </p>
          </div>
        </div>

        <!-- 底部 -->
        <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">
            此邮件由系统自动发送，请勿直接回复
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, text, html };
}

/**
 * 创建业务员通知邮件模板
 */
/**
 * 修改后的业务员通知邮件模板
 */
export function createSalesInquiryTemplate(
  inquiryData: InquiryWithItems,
  inquiryNo: string,
  factories: { name: string; address?: string }[], // 👈 修改为数组
  salser: { name: string; email: string } // 简化参数
): EmailTemplate {
  const mainFactory = factories[0] || { name: "未知工厂" };
  const subject = `【${mainFactory.name}】新的询价请求 - ${inquiryNo}`;
  const displayName = extractUsernameFromEmail(inquiryData.customerEmail);
  // 渲染相似工厂列表（如果有的话）
  const similarFactoriesHtml =
    factories.length > 1
      ? `<div style="margin-top: 15px; font-size: 13px; color: #666;">
        <strong>关联/相似工厂推荐：</strong>
        ${factories
        .slice(1)
        .map((f) => `<span style="margin-right:10px;">• ${f.name}</span>`)
        .join("")}
       </div>`
      : "";

  const items = inquiryData
    .items!.map(
      (item) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #ddd; background-color: #f8f9fa;">${item.productName}</td>
      <td style="padding: 12px; border: 1px solid #ddd;">${item.productDescription || "-"}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.skuQuantity}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${item.skuPrice ? `$${Number(item.skuPrice).toFixed(2)}` : "-"}</td>
      <td style="padding: 12px; border: 1px solid #ddd;">${item.customerRequirements || "-"}</td>
    </tr>`
    )
    .join("");

  const text = `新的询价请求！单号: ${inquiryNo}, 工厂: ${mainFactory.name}, 客户: ${inquiryData.customerName}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 800px; margin: 20px auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    
    <div style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">
      <p style="margin: 0;"><strong>TO:</strong> ${salser.name}</p>
      <p style="margin: 5px 0;"><strong>FROM:</strong> Inquiry System</p>
      <p style="margin: 5px 0;"><strong>MAIN FACTORY:</strong> ${mainFactory.name}</p>
      ${similarFactoriesHtml} 
    </div>

    <h3 style="color: #2c3e50; border-left: 4px solid #4ca1af; padding-left: 10px;">📋 Quotation Request Detail</h3>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr style="background-color: #343a40; color: white;">
          <th style="padding: 12px; text-align: left;">Item Name</th>
          <th style="padding: 12px; text-align: left;">Description</th>
          <th style="padding: 12px; text-align: center;">Qty</th>
          <th style="padding: 12px; text-align: right;">Price</th>
          <th style="padding: 12px; text-align: left;">Special Requirements</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
    </table>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-top: 25px;">
      <h4 style="margin-top:0;">👤 Customer Information</h4>
      <p style="margin: 5px 0;"><strong>Name:</strong> ${inquiryData.customerName || displayName}</p>
      <p style="margin: 5px 0;"><strong>Company:</strong> ${inquiryData.customerCompany || "-"}</p>
      <p style="margin: 5px 0;"><strong>WhatsApp:</strong> ${inquiryData.customerWhatsapp || "-"}</p>
    </div>

    <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
      System ID: ${inquiryNo} | Generated at: ${new Date().toLocaleString()}
    </p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
/**
 * 创建询价附件
 */
export function createInquiryAttachment(
  inquiryNumber: string,
  excelBuffer: Buffer
): EmailAttachment {
  return {
    filename: `询价单-${inquiryNumber}.xlsx`,
    content: excelBuffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
