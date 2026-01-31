import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

import type { EmailRequest, EmailResult } from "./email.types";

/**
 * 邮件发送服务
 * 专注于邮件发送功能，不包含任何业务逻辑
 */
class EmailService {
  private readonly transporter: Transporter | null;
  private readonly isConfigured: boolean;

  constructor() {
    // 检查邮件服务是否已配置
    this.isConfigured = !!(
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASSWORD &&
      process.env.EMAIL_FROM
    );

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else {
      this.transporter = null;
      console.warn("邮件服务未配置，将使用控制台输出代替邮件发送");
    }
  }

  /**
   * 发送邮件（核心方法）
   * 这是 email 模块对外暴露的唯一核心功能
   */
  async sendEmail(request: EmailRequest): Promise<EmailResult> {
    const { to, cc, bcc, template } = request;

    // 如果邮件服务未配置，使用控制台输出
    if (!(this.isConfigured && this.transporter)) {
      console.log("=== 邮件发送（开发模式） ===");
      console.log(`收件人: ${Array.isArray(to) ? to.join(", ") : to}`);
      if (cc) console.log(`抄送: ${Array.isArray(cc) ? cc.join(", ") : cc}`);
      if (bcc)
        console.log(`密送: ${Array.isArray(bcc) ? bcc.join(", ") : bcc}`);
      console.log(`主题: ${template.subject}`);
      console.log(`内容: ${template.text}`);
      if (template.attachments && template.attachments.length > 0) {
        console.log(
          `附件: ${template.attachments.map((a) => a.filename).join(", ")}`
        );
      }
      console.log("========================");
      return { success: true, devMode: true };
    }

    try {
      const mailOptions: any = {
        from: process.env.EMAIL_FROM,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments: template.attachments,
      };

      // 添加抄送和密送
      if (cc) {
        mailOptions.cc = Array.isArray(cc) ? cc.join(", ") : cc;
      }
      if (bcc) {
        mailOptions.bcc = Array.isArray(bcc) ? bcc.join(", ") : bcc;
      }

      const info = await this.transporter.sendMail(mailOptions);

      console.log("邮件发送成功:", info.messageId);

      // 构建实际发送的邮箱列表
      const sentTo: string[] = [
        ...(Array.isArray(to) ? to : [to]),
        ...(cc ? (Array.isArray(cc) ? cc : [cc]) : []),
        ...(bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []),
      ];

      return {
        success: true,
        messageId: info.messageId,
        sentTo,
      };
    } catch (error) {
      console.error("邮件发送失败:", error);
      return { success: false, error };
    }
  }

  /**
   * 验证邮件服务配置
   */
  async verifyConnection() {
    if (!(this.isConfigured && this.transporter)) {
      console.log("邮件服务未配置，跳过连接验证");
      return { success: true, devMode: true };
    }

    try {
      await this.transporter.verify();
      console.log("邮件服务连接验证成功");
      return { success: true };
    } catch (error) {
      console.error("邮件服务连接验证失败:", error);
      return { success: false, error };
    }
  }
}

// 创建单例实例
const emailService = new EmailService();

/**
 * 导出核心邮件发送函数
 * 这是 email 模块对外暴露的唯一功能
 *
 * @param request 邮件请求对象，包含收件人、模板等信息
 * @returns 发送结果
 */
export async function sendEmail(request: EmailRequest): Promise<EmailResult> {
  return await emailService.sendEmail(request);
}

/**
 * 验证邮件服务配置
 */
export async function verifyEmailConnection() {
  return await emailService.verifyConnection();
}

// 导出类型供业务模块使用
export type {
  EmailAttachment,
  EmailRequest,
  EmailResult,
  EmailTemplate,
} from "./email.types";
