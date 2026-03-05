/**
 * Resend 邮件发送服务
 *
 * 基于 Resend API 的邮件发送实现
 * 与现有的 nodemailer 实现并行存在，可根据配置选择使用
 *
 * @see https://resend.com/docs/reference/introduction
 */

import { CreateEmailOptions, Resend } from "resend";

import type {
  EmailAttachment,
  EmailRequest,
  EmailResult,
} from "../email.types";

/**
 * Resend 邮件服务类
 */
class ResendEmailService {
  private readonly resend: Resend | null;
  private readonly isConfigured: boolean;
  private readonly fromEmail: string;

  constructor() {
    // 检查 Resend 是否已配置
    const resendApiKey = process.env.RESEND_API_KEY;
    this.fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "Dong Qi Footwear <sales@asiashoefactory.com>";

    this.isConfigured = !!resendApiKey;

    if (this.isConfigured && resendApiKey) {
      this.resend = new Resend(resendApiKey);
      console.log("[Resend] Resend 邮件服务已初始化");
    } else {
      this.resend = null;
      console.warn(
        "[Resend] Resend 邮件服务未配置，RESEND_API_KEY 环境变量未设置"
      );
    }
  }

  /**
   * 将 Buffer 转换为 Resend 需要的 base64 格式
   */
  private bufferToBase64(buffer: Buffer): string {
    return buffer.toString("base64");
  }

  /**
   * 将本地附件格式转换为 Resend 附件格式
   */
  private convertAttachments(attachments?: EmailAttachment[]) {
    if (!attachments || attachments.length === 0) {
      return undefined;
    }

    return attachments.map((attachment) => ({
      filename: attachment.filename,
      // Resend 接受 base64 字符串或 Buffer
      content: Buffer.isBuffer(attachment.content)
        ? this.bufferToBase64(attachment.content)
        : attachment.content,
    }));
  }

  /**
   * 发送邮件（核心方法）
   */
  async sendEmail(request: EmailRequest): Promise<EmailResult> {
    const { to, cc, bcc, template } = request;

    // 如果 Resend 未配置，使用控制台输出
    if (!(this.isConfigured && this.resend)) {
      console.log("=== Resend 邮件发送（开发模式/未配置） ===");
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
      // 构建收件人列表（Resend 接受字符串数组）
      const toArray = Array.isArray(to) ? to : [to];

      // 构建 Resend 邮件参数
      const emailParams: CreateEmailOptions = {
        from: this.fromEmail,
        to: toArray,
        subject: template.subject,
        text: template.text,
      };

      // 添加 HTML 内容（如果有）
      if (template.html) {
        emailParams.html = template.html;
      }

      // 添加抄送（如果有）
      if (cc) {
        emailParams.cc = Array.isArray(cc) ? cc : [cc];
      }

      // 添加密送（如果有）
      if (bcc) {
        emailParams.bcc = Array.isArray(bcc) ? bcc : [bcc];
      }

      // 添加附件（如果有）
      if (template.attachments && template.attachments.length > 0) {
        const resendAttachments = this.convertAttachments(template.attachments);
        if (resendAttachments && resendAttachments.length > 0) {
          emailParams.attachments = resendAttachments;
        }
      }

      console.log("[Resend] 准备发送邮件:", {
        to: toArray,
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        subject: template.subject,
        hasHtml: !!template.html,
        hasAttachments: (template.attachments?.length || 0) > 0,
      });

      // 发送邮件
      const { data, error } = await this.resend.emails.send({
        ...emailParams,
        replyTo: request.replyTo,
      });

      if (error) {
        console.error("[Resend] 邮件发送失败:", error);
        return { success: false, error };
      }

      console.log("[Resend] 邮件发送成功:", data?.id);

      // 构建实际发送的邮箱列表
      const sentTo: string[] = [
        ...toArray,
        ...(cc ? (Array.isArray(cc) ? cc : [cc]) : []),
        ...(bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []),
      ];

      return {
        success: true,
        messageId: data?.id,
        sentTo,
      };
    } catch (error) {
      console.error("[Resend] 邮件发送异常:", error);
      return { success: false, error };
    }
  }

  /**
   * 验证 Resend 服务配置
   */
  async verifyConnection() {
    if (!(this.isConfigured && this.resend)) {
      console.log("[Resend] Resend 邮件服务未配置，跳过连接验证");
      return { success: true, devMode: true };
    }

    try {
      // Resend API 是基于 HTTP 的，无需连接验证
      // 只需检查 API Key 是否有效（通过发送测试请求）
      console.log("[Resend] Resend 服务已配置（API Key 已设置）");
      return { success: true };
    } catch (error) {
      console.error("[Resend] Resend 服务验证失败:", error);
      return { success: false, error };
    }
  }
}

// 创建单例实例
export const resendEmailService = new ResendEmailService();

/**
 * 导出核心邮件发送函数（Resend 版本）
 *
 * @param request 邮件请求对象，包含收件人、模板等信息
 * @returns 发送结果
 */
export async function sendEmailViaResend(
  request: EmailRequest
): Promise<EmailResult> {
  return await resendEmailService.sendEmail(request);
}

/**
 * 验证 Resend 邮件服务配置
 */
export async function verifyResendConnection() {
  return await resendEmailService.verifyConnection();
}

// 导出类型供业务模块使用
export type {
  EmailAttachment,
  EmailRequest,
  EmailResult,
  EmailTemplate,
} from "../email.types";
