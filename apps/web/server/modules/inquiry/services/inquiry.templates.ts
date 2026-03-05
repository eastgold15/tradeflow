/**
 * 询价模块邮件模板
 * 处理询价确认、询价通知等业务相关的邮件模板
 */

import type { InquiryWithItems } from "~/service/inquiry.service";
import { EmailAttachment, EmailTemplate } from "~/utils/email/email.types";

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
  const displayName =
    inquiryData.customerName || extractUsernameFromEmail(inquiryData.email);

  const subject = `Inquiry Confirmation - Ref: ${inquiryNumber} - DONG QI FOOTWEAR`;

  const text = `Dear ${displayName}, Thank you for your interest in ${productName}! We have received your inquiry (Ref: ${inquiryNumber}). Our sales team will review your requirements and contact you within 24 hours.`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Inquiry Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">Inquiry Confirmation</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for reaching out to us</p>
        </div>

        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 25px;">
            Dear <strong>${displayName}</strong>,
          </p>

          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 25px;">
            We have successfully received your inquiry regarding <strong style="color: #4ca1af;">${productName}</strong>. Our team is currently reviewing your request.
          </p>

          <div style="background-color: #f8f9fa; border-left: 4px solid #4ca1af; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px;">Inquiry Reference</p>
            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #2c3e50;">
              ${inquiryNumber}
            </p>
          </div>

          <div style="background-color: #e8f4f8; padding: 20px; border-radius: 4px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #2c3e50; font-size: 16px; border-bottom: 1px solid #d1e9f0; padding-bottom: 10px;">Inquiry Summary</h3>
            <table style="width: 100%; color: #555; line-height: 2; font-size: 14px;">
              <tr>
                <td style="width: 40%; font-weight: bold;">Product:</td>
                <td>${productName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Company:</td>
                <td>${inquiryData.companyName || "N/A"}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Phone:</td>
                <td>${inquiryData.phone || "N/A"}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">WhatsApp:</td>
                <td>${inquiryData.whatsapp || "N/A"}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Date:</td>
                <td>${inquiryData.createdAt.toUTCString()}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5;">
              <strong>⏰ Response Time:</strong> Our sales representative will contact you via email or phone within <strong>24 business hours</strong> to provide a detailed quote and discuss your requirements.
            </p>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 40px;">
            <h4 style="color: #2c3e50; font-size: 16px; margin-bottom: 10px;">DONG QI FOOTWEAR INTL MFG CO., LTD</h4>
            <p style="color: #7f8c8d; font-size: 13px; line-height: 1.8; margin: 0;">
              📍 No.2 Chiling Road, Chiling Industrial Zone, Houjie, Dongguan, Guangdong, China<br>
              🌐 <a href="https://www.dongqifootwear.com" style="color: #4ca1af; text-decoration: none;">www.dongqifootwear.com</a><br>
              📧 <a href="mailto:sales@dongqifootwear.com" style="color: #4ca1af; text-decoration: none;">sales@dongqifootwear.com</a>
            </p>
          </div>
        </div>

        <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 12px; opacity: 0.7; letter-spacing: 0.5px;">
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, text, html };
}

export function createSalesInquiryTemplate(
  inquiryData: InquiryWithItems,
  inquiryNo: string,
  factories: { name: string; address?: string }[],
  salser: { name: string; email: string }
): EmailTemplate {
  const mainFactory = factories[0] || { name: "General Factory" };

  // 优化后的英文主题：包含紧急程度和单号
  const subject = `[New Inquiry] Ref: ${inquiryNo} - Attention: ${mainFactory.name}`;

  const displayName = extractUsernameFromEmail(inquiryData.customerEmail);

  // 推荐工厂部分的英文润色
  const similarFactoriesHtml =
    factories.length > 1
      ? `<div style="margin-top: 15px; font-size: 13px; color: #666;">
          <strong>Related/Recommended Factories:</strong>
          ${factories
            .slice(1)
            .map((f) => `<span style="margin-right:10px;">• ${f.name}</span>`)
            .join("")}
         </div>`
      : "";

  const items = inquiryData
    .items!.map(
      (item: {
        productName: any;
        productDescription: any;
        skuQuantity: any;
        skuPrice: any;
        customerRequirements: any;
      }) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #ddd; background-color: #f8f9fa; font-weight: bold;">${item.productName}</td>
      <td style="padding: 12px; border: 1px solid #ddd;">${item.productDescription || "N/A"}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.skuQuantity}</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${item.skuPrice ? `$${Number(item.skuPrice).toFixed(2)}` : "TBD"}</td>
      <td style="padding: 12px; border: 1px solid #ddd;">${item.customerRequirements || "Standard"}</td>
    </tr>`
    )
    .join("");

  const text = `New Inquiry Alert! Order No: ${inquiryNo}, Target Factory: ${mainFactory.name}, Customer: ${inquiryData.customerName || displayName}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Arial, sans-serif; color: #333;">
  <div style="max-width: 850px; margin: 20px auto; background-color: white; padding: 35px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    
    <div style="margin-bottom: 25px;">
      <h2 style="color: #2c3e50; margin-top: 0;">New Inquiry Received</h2>
      <p style="font-size: 15px; color: #555; line-height: 1.6;">
        Dear Sir<br>
          A new inquiry has been submitted through the website portal. Please review the below requirements w/attachment and send your best offer to the below email address accordingly.
      </p>
    </div>

    <h3 style="color: #2c3e50; border-left: 4px solid #4ca1af; padding-left: 12px; font-size: 18px; margin-bottom: 15px;">📋 Quotation Request Detail</h3>
    
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
        <thead>
          <tr style="background-color: #2c3e50; color: white;">
            <th style="padding: 12px; text-align: left;">Item Name</th>
            <th style="padding: 12px; text-align: left;">Description</th>
            <th style="padding: 12px; text-align: center;">Qty</th>
            <th style="padding: 12px; text-align: right;">Target Price</th>
            <th style="padding: 12px; text-align: left;">Requirements</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
    </div>

    ${similarFactoriesHtml}

    <div style="background-color: #f8f9fa; padding: 25px; border-radius: 6px; margin-top: 30px; border: 1px solid #eee;">
      <h4 style="margin-top: 0; color: #2c3e50; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">👤 </h4>
      <table style="width: 100%; font-size: 14px; color: #444; line-height: 2;">
        ${inquiryData.customerName || displayName ? `<tr><td style="width: 120px; font-weight: bold;">Contact Name:</td><td>${inquiryData.customerName || displayName}</td></tr>` : ""}
        ${inquiryData.customerCompany ? `<tr><td style="font-weight: bold;">Company:</td><td>${inquiryData.customerCompany}</td></tr>` : ""}
        ${inquiryData.customerEmail ? `<tr><td style="font-weight: bold;">Email:</td><td><a href="mailto:${inquiryData.customerEmail}" style="color: #4ca1af;">${inquiryData.customerEmail}</a></td></tr>` : ""}
        ${inquiryData.customerPhone ? `<tr><td style="font-weight: bold;">Phone:</td><td>${inquiryData.customerPhone}</td></tr>` : ""}
        ${inquiryData.customerWhatsapp ? `<tr><td style="font-weight: bold;">WhatsApp:</td><td>${inquiryData.customerWhatsapp}</td></tr>` : ""}
      </table>
    </div>

    <div style="margin-top: 30px; text-align: center;">
       <p style="font-size: 13px; color: #7f8c8d;">Please follow up with the customer within 12-24 hours for better conversion.</p>
    </div>

    <p style="font-size: 12px; color: #999; margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
      <strong>Internal Tracking ID:</strong> ${inquiryNo} | <strong>Generated:</strong> ${new Date().toUTCString()}
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
    filename: `Inquiry list-${inquiryNumber}.xlsx`,
    content: excelBuffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
