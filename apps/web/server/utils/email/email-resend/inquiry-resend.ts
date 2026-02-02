/**
 * 询价模块 Resend 邮件发送工具
 *
 * 专门用于将现有的询价模板对接到 Resend 邮件服务
 * 复用现有的模板函数，但使用 Resend API 发送
 */

import type { InquiryWithItems } from "~/service/inquiry.service";

import {
  createCustomerInquiryTemplate,
  createInquiryAttachment,
  createSalesInquiryTemplate,
} from "../../../modules/inquiry/services/inquiry.templates";
import { EmailAttachment, resendEmailService, sendEmailViaResend } from "./email-resend";


/**
 * 📧 发送客户询价确认邮件（使用 Resend）
 *
 * @param toEmail 客户邮箱
 * @param inquiryData 询价数据
 * @param inquiryNumber 询价单号
 * @param productName 产品名称
 */
export async function sendCustomerInquiryEmailViaResend(
  toEmail: string,
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
) {
  // 1. 生成邮件模板
  const template = createCustomerInquiryTemplate(
    inquiryData,
    inquiryNumber,
    productName
  );

  // 2. 发送邮件
  const result = await sendEmailViaResend({
    to: toEmail,
    template,
  });

  return result;
}

/**
 * 📧 发送业务员询价通知邮件（使用 Resend）
 *
 * @param toEmail 业务员邮箱
 * @param bccEmails 需要抄送的管理员邮箱列表
 * @param inquiryData 询价数据（带 items）
 * @param inquiryNumber 询价单号
 * @param factories 工厂信息列表
 * @param salesperson 业务员信息
 * @param excelBuffer Excel 文件 Buffer（可选）
 */
export async function sendSalesInquiryEmailViaResend(
  toEmail: string,
  bccEmails: string[],
  inquiryData: InquiryWithItems,
  inquiryNumber: string,
  factories: { name: string; address?: string }[],
  salesperson: { name: string; email: string },
  excelBuffer?: Buffer
) {
  // 1. 生成邮件模板
  const template = createSalesInquiryTemplate(
    inquiryData,
    inquiryNumber,
    factories,
    salesperson
  );
  // 3. 发送邮件
  const result = await sendEmailViaResend({
    to: toEmail,
    cc: undefined,
    bcc: bccEmails.length > 0 ? bccEmails : undefined,
    template: {
      ...template,
      attachments: excelBuffer ? [createInquiryAttachment(inquiryNumber, excelBuffer)] : undefined
    }
  });

  return result;
}

/**
 * 📧 便捷函数：发送完整的询价邮件包（使用 Resend）
 *
 * 这个函数封装了整个询价邮件发送流程：
 * - 客户确认邮件
 * - 业务员通知邮件（带 Excel 附件）
 * - 管理员抄送
 *
 * @param params 邮件发送参数
 */
export async function sendInquiryEmailPackageViaResend(params: {
  // 客户邮件参数
  customerEmail: string;
  customerData: {
    id: string;
    customerName: string;
    companyName?: string;
    email: string;
    phone?: string;
    whatsapp?: string;
    status: string;
    createdAt: Date;
    notes?: string;
  };
  inquiryNumber: string;
  productName: string;

  // 业务员邮件参数
  salespersonEmail: string;
  adminEmails?: string[];
  salesInquiryData: InquiryWithItems;
  factories: { name: string; address?: string }[];
  salesperson: { name: string; email: string };

  // 附件
  excelBuffer?: Buffer;
}) {
  const results = {
    customerEmail: null as Awaited<ReturnType<typeof sendEmailViaResend>> | null,
    salesEmail: null as Awaited<ReturnType<typeof sendEmailViaResend>> | null,
  };

  // 1. 发送客户确认邮件
  try {
    console.log("[Resend] 开始发送客户确认邮件...");
    results.customerEmail = await sendCustomerInquiryEmailViaResend(
      params.customerEmail,
      params.customerData,
      params.inquiryNumber,
      params.productName
    );
    console.log("[Resend] 客户邮件发送结果:", results.customerEmail);
  } catch (error) {
    console.error("[Resend] 客户邮件发送失败:", error);
    results.customerEmail = { success: false, error };
  }

  // 2. 发送业务员通知邮件（带管理员抄送和 Excel 附件）
  try {
    console.log("[Resend] 开始发送业务员通知邮件...");
    results.salesEmail = await sendSalesInquiryEmailViaResend(
      params.salespersonEmail,
      params.adminEmails || [],
      params.salesInquiryData,
      params.inquiryNumber,
      params.factories,
      params.salesperson,
      params.excelBuffer
    );
    console.log("[Resend] 业务员邮件发送结果:", results.salesEmail);
  } catch (error) {
    console.error("[Resend] 业务员邮件发送失败:", error);
    results.salesEmail = { success: false, error };
  }

  return results;
}

/**
 * 📧 使用示例
 *
 * ```typescript
 * import { sendInquiryEmailPackageViaResend } from './inquiry-resend';
 *
 * // 在你的业务代码中调用
 * const results = await sendInquiryEmailPackageViaResend({
 *   // 客户邮件参数
 *   customerEmail: 'customer@example.com',
 *   customerData: {
 *     id: 'xxx',
 *     customerName: 'John Doe',
 *     companyName: 'ABC Company',
 *     email: 'customer@example.com',
 *     phone: '+1234567890',
 *     whatsapp: '+1234567890',
 *     status: 'pending',
 *     createdAt: new Date(),
 *   },
 *   inquiryNumber: 'INQ202501001',
 *   productName: 'Sport Shoes',
 *
 *   // 业务员邮件参数
 *   salespersonEmail: 'sales@dongqifootwear.com',
 *   adminEmails: ['admin1@dongqifootwear.com', 'admin2@dongqifootwear.com'],
 *   salesInquiryData: inquiryWithItems,
 *   factories: [{ name: 'Factory A', address: 'Address A' }],
 *   salesperson: { name: 'Sales Person', email: 'sales@dongqifootwear.com' },
 *
 *   // 附件
 *   excelBuffer: excelFileBuffer,
 * });
 *
 * if (results.customerEmail?.success) {
 *   console.log('客户邮件发送成功');
 * }
 * if (results.salesEmail?.success) {
 *   console.log('业务员邮件发送成功');
 * }
 * ```
 */
