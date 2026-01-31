/**
 * 邮件模块类型定义
 * 定义邮件发送相关的接口和类型
 */

/**
 * 邮件附件
 */
export interface EmailAttachment {
  /** 文件名 */
  filename: string;
  /** 文件内容（Buffer 或字符串） */
  content: Buffer | string;
  /** MIME 类型 */
  contentType?: string;
}

/**
 * 邮件模板
 */
export interface EmailTemplate {
  /** 邮件主题 */
  subject: string;
  /** 纯文本内容 */
  text: string;
  /** HTML 内容（可选） */
  html?: string;
  /** 邮件附件（可选） */
  attachments?: EmailAttachment[];
}

/**
 * 邮件请求
 */
export interface EmailRequest {
  /** 收件人（支持多个） */
  to: string | string[];
  /** 抄送（可选） */
  cc?: string | string[];
  /** 密送（可选） */
  bcc?: string | string[];
  /** 邮件模板 */
  template: EmailTemplate;
}

/**
 * 邮件发送结果
 */
export interface EmailResult {
  /** 发送是否成功 */
  success: boolean;
  /** 邮件 ID（如果成功） */
  messageId?: string;
  /** 错误信息（如果失败） */
  error?: any;
  /** 是否为开发模式（使用控制台输出） */
  devMode?: boolean;
  /** 实际发送的邮箱列表（用于调试） */
  sentTo?: string[];
}
