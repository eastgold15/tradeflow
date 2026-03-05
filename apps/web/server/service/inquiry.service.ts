/**
 * ✍️ 【WEB Service - 业务自定义】
 * --------------------------------------------------------
 * 💡 处理复杂的询价提交流程：客户管理、媒体保存、Excel生成、邮件分发。
 * 📊 重构说明：
 *    - 移除 salespersonTable，改用 userTable + salesResponsibilityTable
 *    - 匹配逻辑：通过 salesResponsibilityTable 轮询分配业务员
 *    - 支持多租户、站点隔离
 *    - 使用 siteProduct 和 siteSku 替代直接查询 product 和 sku
 * 🚀 核心优化：
 *    - 并行异步处理 (Promise.all) 显著减少等待时间
 *    - 逻辑拆分：SKU 媒体继承逻辑独立为 resolveEffectiveMediaId
 *    - 确定性排序：增加 userId 作为次要排序键防止随机分配
 *    - 类型安全：extractUsernameFromEmail 提升为静态工具方法
 *    - 批量获取工厂邮箱：resolveFactoryEmails 并行查询
 * --------------------------------------------------------
 */

import { HttpError } from "@pori15/logixlysia";
import {
  customerTable,
  type InquiryContract,
  inquiryTable,
  productTemplateTable,
  roleTable,
  salesResponsibilityTable,
  templateKeyTable,
  templateValueTable,
  userRoleTable,
  userTable,
} from "@repo/contract";
import { and, eq } from "drizzle-orm";
import { db } from "~/db/connection";

import type { ServiceContext } from "~/middleware/site";
import { QuotationData } from "~/modules/inquiry/excelTemplate/QuotationData";
import { generateInquiryNumber } from "~/modules/inquiry/services/dayCount";
import { generateQuotationExcel } from "~/modules/inquiry/services/excel.service";

import { sendSalesInquiryEmailViaResend } from "~/utils/email/email-resend/inquiry-resend";
import { isImageMedia } from "~/utils/media";
import {
  findSiteProductWithRelations,
  findSiteSkuWithRelations,
  SiteProductWithRelations,
  SiteSkuWithRelations,
} from "./inquiry.repos";

type Exporter = {
  // 唯一标识 ID
  id: string;
  // 创建时间（ISO 格式字符串）
  createdAt: string;
  // 更新时间（ISO 格式字符串）
  updatedAt: string;
  // 租户 ID
  tenantId: string;
  // 父级 ID（可为 null，表示无父级）
  parentId: string | null;
  // 企业名称
  name: string;
  // 企业编码
  code: string;
  // 企业分类（此处为固定值 "group"，也可扩展为联合类型）
  category: string; // 若需严格约束，可改为：category: "group" | "company" | "branch";
  // 企业地址
  address: string;
  // 联系电话
  contactPhone: string;
  // 企业 logo（可为 null，表示无 logo）
  logo: string | null;
  // 扩展字段（可为 null，表示无扩展信息）
  extensions: unknown | null; // 若知道扩展字段结构，可替换 unknown 为具体类型
  // 是否正在合作
  isCooperating: boolean;
  // 是否启用
  isActive: boolean;
  // 企业邮箱
  email: string;
};

type Factory = {
  // 唯一标识 ID
  id: string;
  // 创建时间（ISO 格式字符串）
  createdAt: string;
  // 更新时间（ISO 格式字符串）
  updatedAt: string;
  // 租户 ID
  tenantId: string;
  // 父级 ID（此处为具体字符串，兼容之前的 null 场景，保证通用性）
  parentId: string | null;
  // 企业/工厂名称
  name: string;
  // 企业编码
  code: string;
  // 企业分类（目前出现 factory/group，做字面量联合约束，提升类型安全）
  category: "factory" | "group";
  // 企业详细地址
  address: string;
  // 联系电话
  contactPhone: string;
  // 企业 Logo（无则为 null，暂定义为 string | null，后续有文件路径可直接适配）
  logo: string | null;
  // 扩展字段（无则为 null，未知结构用 unknown，比 any 更安全）
  extensions: unknown | null;
  // 是否正在合作
  isCooperating: boolean;
  // 是否启用
  isActive: boolean;
  // 企业邮箱
  email: string;
};
// 外部业务工具
// 类型定义
type TransactionFn = Parameters<(typeof db)["transaction"]>[0];
type TxType = Parameters<TransactionFn>[0];

// 📊 出口商和工厂信息类型
type ExporterInfo = {
  id: string;
  name: string;
  address?: string | null;
  contactPhone?: string | null;
  email?: string | null; // 出口商管理员邮箱
};

type FactoryInfo = {
  id: string;
  name: string;
  address?: string | null;
  contactPhone?: string | null;
  email?: string | null; // 工厂管理员邮箱
};

type TenantInfo = {
  name: string;
  address?: string | null;
  website?: string | null;
  bankInfo?: { beneficiary: string; accountNo: string } | null;
};

// 外部业务工具
// 类型定义

type UserWithResponsibility = Awaited<
  ReturnType<typeof InquiryService.prototype.findBestSalesperson>
>;
type validateAndGetSkuData = Awaited<
  ReturnType<typeof InquiryService.prototype.validateAndResolveSku>
>;

type Inquiry = typeof inquiryTable.$inferSelect;
type SiteSku = validateAndGetSkuData["siteSku"];
type SiteProduct = validateAndGetSkuData["siteProduct"];

type ExporterAndFactory = {
  exporter: ExporterInfo | null;
  factories: FactoryInfo[];
  tenant: TenantInfo | null;
};

/**
 * 询价服务类
 */
export class InquiryService {
  /**
   * 🚀 询价提交：事务处理 + 分单逻辑 + 异步通知
   */
  async submit(
    body: typeof InquiryContract.Create.static,
    ctx: ServiceContext
  ) {
    const { site } = ctx;

    // 1. 验证并获取商品/SKU数据 (逻辑解耦)
    const skuData = await this.validateAndResolveSku(body, ctx);
    const { siteProduct, siteSku, effectiveMediaId } = skuData;

    // 2. 获取商品的主分类（用于匹配业务员）
    const masterCategoryIds = await this.getProductMasterCategories(
      siteProduct.productId
    );

    // 3. 开启事务处理核心业务逻辑
    const result = await db.transaction(async (tx) => {
      // 3.1 客户管理 (Upsert)
      await this.upsertCustomer(body, ctx.site.tenantId, tx);

      // 3.2 生成业务单号
      const inquiryNum = await generateInquiryNumber();

      // 3.3 匹配最佳业务员 (增加稳定性排序)
      const targetRep = await this.findBestSalesperson(
        masterCategoryIds,
        ctx,
        tx
      );

      // 3.4 创建询价主表
      const [newInquiry] = await tx
        .insert(inquiryTable)
        .values({
          inquiryNum,
          customerName: body.customerName,
          customerCompany: body.customerCompany,
          customerEmail: body.customerEmail,
          customerPhone: body.customerPhone,
          customerWhatsapp: body.customerWhatsapp,
          status: "pending",

          siteProductId: siteProduct.id,
          siteSkuId: siteSku?.id ?? null, // 支持无 SKU 的情况

          productName: siteProduct.siteName!,
          productDescription: siteProduct.siteDescription ?? "",

          quantity: body.quantity,
          price: siteSku?.price ?? null,
          paymentMethod: body.paymentMethod,
          customerRequirements: body.customerRequirements,
          masterCategoryId: masterCategoryIds[0],

          ownerId: targetRep?.userId,
          isPublic: !!targetRep,
          siteId: site.id,
          tenantId: site.tenantId,
          createdBy: targetRep?.userId,
        })
        .returning();

      // 3.5 更新业务员最后分配时间
      if (targetRep) {
        await this.updateSalesRepLastAssigned(targetRep.id, tx);
      }

      return { targetRep, inquiry: newInquiry };
    });

    // 4. 事务外：异步执行耗时任务 (Parallel Execution Optimization)
    // 即使邮件发送失败，也不应回滚订单
    this.handleAsyncNotifications(
      result.targetRep,
      result.inquiry,
      siteProduct,
      siteSku,
      effectiveMediaId
    ).catch((err) => {
      console.error(
        `[❌ Critical] Async notification failed for ${result.inquiry.inquiryNum}:`,
        err
      );
    });

    return {
      success: true,
      inquiryNumber: result.inquiry.inquiryNum,
      assignedTo: result.targetRep?.user?.name || "Public Pool",
    };
  }

  // ===========================================================================
  // 🧩 核心逻辑拆分 (Logic Separation)
  // ===========================================================================

  /**
   * 🔍 验证商品并解析 SKU 及其最佳媒体 ID
   */
  public async validateAndResolveSku(
    body: typeof InquiryContract.Create.static,
    ctx: ServiceContext
  ) {
    // 1. 获取 SiteProduct
    const siteProduct = await findSiteProductWithRelations(
      ctx.site.id,
      body.siteProductId
    );

    if (!siteProduct)
      throw new HttpError.BadRequest(
        `Product not found in this site${body.siteProductId} `
      );

    // 2. 获取 SiteSku (如果存在)

    const siteSku = await findSiteSkuWithRelations(
      siteProduct.id,
      body.siteSkuId
    );
    if (!siteSku) throw new HttpError.BadRequest("SKU not found");

    // 3. 解析继承逻辑后的有效媒体 ID
    const effectiveMediaId = await this.resolveEffectiveMediaId(
      siteProduct,
      siteSku,
      body.skuMediaId
    );

    return { siteProduct, siteSku, effectiveMediaId };
  }

  /**
   * 🎨 解析媒体 ID (三级继承逻辑：SKU > 变体 > 商品)
   */
  private async resolveEffectiveMediaId(
    siteProduct: SiteProductWithRelations,
    siteSku: SiteSkuWithRelations,
    preferredMediaId?: string
  ): Promise<string> {
    // 1. 收集所有媒体 ID + URL 映射（用于判断类型）
    const mediaMap = new Map<string, string>(); // id -> url

    // 商品级媒体
    for (const m of siteProduct.product.media) {
      mediaMap.set(m.id, m.url);
    }

    // SKU 媒体
    if (siteSku?.sku.media) {
      for (const m of siteSku.sku.media) {
        mediaMap.set(m.id, m.url);
      }
    }

    // 变体媒体（继承）
    let inheritedMediaIds: string[] = [];
    if (siteSku) {
      const colorInfo = await this.identifyColorAttribute(
        siteProduct.productId
      );
      if (colorInfo) {
        const specs = siteSku.sku.specJson as Record<string, string>;
        const colorValue = specs[colorInfo.key] || specs.颜色;
        if (colorValue) {
          const attrValId = await this.getAttributeValueId(
            colorInfo.keyId,
            colorValue
          );
          if (attrValId) {
            inheritedMediaIds = siteProduct.product.variantMedia
              .filter((vm) => vm.attributeValueId === attrValId)
              .map((vm) => vm.mediaId);

            // 加入 mediaMap
            for (const vm of siteProduct.product.variantMedia) {
              if (vm.attributeValueId === attrValId) {
                mediaMap.set(vm.mediaId, vm.media!.url);
              }
            }
          }
        }
      }
    }

    // 2. 构建候选 ID 列表（按优先级）
    const candidateIds: string[] = [];

    // 优先：用户指定的 preferredMediaId（如果是图片）
    if (preferredMediaId && mediaMap.has(preferredMediaId)) {
      const url = mediaMap.get(preferredMediaId)!;
      if (isImageMedia(url)) {
        return preferredMediaId; // ✅ 直接返回
      }
    }

    // 按优先级收集所有图片 ID
    const addImageIds = (ids: string[]) => {
      for (const id of ids) {
        const url = mediaMap.get(id);
        if (url && isImageMedia(url)) {
          candidateIds.push(id);
        }
      }
    };

    // 顺序：SKU → 变体 → 商品
    if (siteSku?.sku.media) {
      addImageIds(siteSku.sku.media.map((m) => m.id));
    }
    addImageIds(inheritedMediaIds);
    addImageIds(siteProduct.product.media.map((m) => m.id));

    // 3. 返回第一个有效图片
    if (candidateIds.length > 0) {
      return candidateIds[0];
    }

    // 4. 如果没有图片，但有媒体，返回第一个（可能是视频，作为兜底）
    const allIds = Array.from(mediaMap.keys());
    return allIds[2];
  }

  /**
   * 📧 处理异步通知 (并行优化)
   *
   * 邮件抄送规则：
   * - 收件人：分配的业务员
   * - BCC (密送)：出口商管理员（永远）+ 当前工厂管理员（如果工厂已合作）
   */
  private async handleAsyncNotifications(
    targetRep: any,
    inquiry: any,
    siteProduct: any,
    siteSku: any,
    mediaId?: string
  ) {
    if (!targetRep?.user?.email) {
      console.log(
        "[⚠️] No sales rep assigned or missing email, skipping notification."
      );
      return;
    }

    console.log("=== 🚀 [Async] Starting Notification Flow ===");

    // 🔥 并行获取所有必要数据 (Parallel Fetching)
    const [exporterAndFactories, mediaInfo] = await Promise.all([
      this.getExporterAndFactoryInfo(inquiry.siteId),
      mediaId
        ? db.query.mediaTable.findFirst({ where: { id: mediaId } })
        : null,
    ]);

    const { exporter, factories, tenant } = exporterAndFactories;
    const mainFactory = factories[0];

    // 获取工厂的合作状态
    const siteDept = await db.query.departmentTable.findFirst({
      where: { id: mainFactory.id },
      columns: { id: true, isCooperating: true },
    });
    const isCooperating = siteDept?.isCooperating ?? false;

    console.log("工厂合作状态:", isCooperating ? "✅ 已合作" : "❌ 未合作");

    // 🔥 二次并行：依赖于上面结果的数据
    const [adminEmails, photoData] = await Promise.all([
      this.getAdminEmails(inquiry.tenantId, mainFactory.id), // 出口商管理员
      this.downloadImage(mediaInfo?.url),
    ]);

    // 📧 构建 BCC 列表：出口商管理员永远抄送，工厂用户看合作状态
    const bccEmails = [...adminEmails];
    if (isCooperating) {
      // 工厂已合作，添加工厂用户到抄送
      factories.forEach((f) => {
        if (f.email && !bccEmails.includes(f.email)) {
          bccEmails.push(f.email);
        }
      });
      console.log(
        "✅ 工厂已合作，抄送工厂管理员用户:",
        factories.map((f) => f.email).filter(Boolean)
      );
    } else {
      console.log("⚠️ 工厂未合作，不抄送工厂管理员用户");
    }

    // 生成 Excel
    const excelBuffer = await this.generateExcelSafe(
      inquiry,
      siteProduct,
      siteSku,
      exporter,
      factories,
      tenant,
      photoData
    );

    // 转换数据格式
    const inquiryWithItems = InquiryService.transformInquiry(inquiry);

    // 发送邮件
    await sendSalesInquiryEmailViaResend(
      targetRep.user.email,
      bccEmails, // 合并后的 BCC 列表
      inquiryWithItems,
      inquiry.inquiryNum,
      factories.map((f) => ({ name: f.name, address: f.address || "" })),
      { name: targetRep.user.name, email: targetRep.user.email },
      excelBuffer
    );

    console.log("=== ✅ [Async] Notification Flow Complete ===");
  }

  // ===========================================================================
  // 🛠️ 辅助逻辑 (Helpers)
  // ===========================================================================

  /**
   * 🔍 匹配最佳业务员 (工厂合作优先逻辑)
   *
   * 优先级规则：
   * 1. 如果工厂已合作 (isCooperating=true) → 优先分配给工厂的业务员
   * 2. 如果工厂未合作 (isCooperating=false) → 分配给出口商的业务员
   */
  async findBestSalesperson(
    categoryIds: string[],
    ctx: ServiceContext,
    tx: TxType
  ) {
    const { boundDeptId, tenantId, id: siteId } = ctx.site;
    ctx.site.id;

    console.log("=== 🔍 [findBestSalesperson] 开始匹配业务员 ===");
    console.log("站点ID:", siteId);
    console.log("boundDeptId:", boundDeptId);
    console.log("tenantId:", tenantId);
    console.log("categoryIds:", categoryIds);

    // 获取站点的部门合作状态（需要查询 department 表）
    const Dept = await tx.query.departmentTable.findFirst({
      where: { id: boundDeptId },
      columns: {
        id: true,
        name: true,
        isCooperating: true,
        parentId: true,
        category: true,
      },
    });

    if (!Dept) {
      console.log("❌ 未找到站点部门信息");
      return null;
    }

    console.log("站点部门:", Dept.name);
    console.log(
      "工厂合作状态:",
      Dept.isCooperating ? "✅ 已合作" : "❌ 未合作"
    );

    // 查询当前站点所有责任记录
    const responsibilities = await tx.query.salesResponsibilityTable.findMany({
      where: {
        masterCategoryId: {
          in: categoryIds,
        },
        siteId,
        tenantId,
        isAutoAssign: true,
      },
      with: { user: true },
    });

    console.log("查询到的责任记录数:", responsibilities.length);

    // 根据合作状态确定目标部门 ID
    let targetDeptId: string | null = null;
    let assignmentReason = "";

    if (Dept.isCooperating) {
      // 已合作：优先分配给当前工厂的业务员
      targetDeptId = boundDeptId;
      assignmentReason = "工厂已合作，分配给工厂业务员";
    } else {
      // 未合作：分配给出口商的业务员
      if (Dept.category === "group") {
        // 当前站点本身就是出口商
        targetDeptId = boundDeptId;
        assignmentReason = "当前站点是出口商";
      } else if (Dept.parentId) {
        // 工厂站点，使用父部门（出口商）ID
        targetDeptId = Dept.parentId;
        assignmentReason = "工厂未合作，分配给出口商业务员";
      } else {
        // 没有父部门，使用当前部门
        targetDeptId = boundDeptId;
        assignmentReason = "无父部门，使用当前部门";
      }
    }

    console.log("分配策略:", assignmentReason);
    console.log("目标部门ID:", targetDeptId);

    // 过滤：部门匹配 + 活跃状态
    const candidates = responsibilities.filter((r) => {
      const isDeptMatch = targetDeptId ? r.user?.deptId === targetDeptId : true;
      const isMatch = isDeptMatch && r.user?.isActive;
      if (isMatch) {
        console.log(`  ✅ ${r.user?.name} (${r.user?.email}) - 匹配成功`);
      }
      return isMatch;
    });

    console.log("过滤后的候选人数:", candidates.length);

    if (candidates.length === 0) {
      console.log("❌ 没有找到匹配的业务员");
      return null;
    }

    // 排序：优先最久未分配 (lastAssignedAt asc)，其次按 ID 排序 (保证稳定性)
    candidates.sort((a, b) => {
      const timeA = a.lastAssignedAt?.getTime() || 0;
      const timeB = b.lastAssignedAt?.getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.userId.localeCompare(b.userId); // Deterministic tie-breaker
    });

    const selected = candidates[0];
    console.log(
      "✅ 选中业务员:",
      selected.user?.name,
      `(${selected.user?.email})`
    );

    return selected;
  }

  /**
   * 📊 安全生成 Excel (带错误捕获)
   */
  private async generateExcelSafe(
    inquiry: any,
    siteProduct: any,
    siteSku: any,
    exporter: any,
    factories: any[],
    tenant: any,
    photoBuffer: { buffer: Buffer<ArrayBufferLike>; mimeType: string } | null
  ) {
    try {
      // 获取站点域名
      const site = await db.query.siteTable.findFirst({
        where: { id: inquiry.siteId },
        columns: { domain: true },
      });
      const siteWeb = site?.domain
        ? `www.${site.domain}`
        : tenant?.website || "www.dongqifootwear.com";

      const data = this.mapToExcelData(
        inquiry,
        siteProduct,
        siteSku,
        exporter,
        factories,
        tenant,
        siteWeb,
        photoBuffer
          ? {
              buffer: photoBuffer.buffer,
              mimeType: photoBuffer.mimeType,
              name: "ref-img",
            }
          : null
      );

      // 添加缺失的银行信息和客户地址字段（优先使用数据库中的值）
      const fullData: QuotationData = {
        ...data,
        bankBeneficiary:
          tenant?.bankInfo?.beneficiary ||
          exporter?.name ||
          "DONG QI FOOTWEAR (JIANGXI) CO., LTD",
        bankAccountNo: tenant?.bankInfo?.accountNo || "",
        bankName: "Bank of China", // 可从租户配置获取
        bankAddr:
          tenant?.address || "No.1 Fuxingmen Nei Street, Beijing, China",
        clientAddr: inquiry.customerAddress || "N/A", // 客户地址（可选）
      };

      // 🖨️ 打印传给 Excel 的值
      console.log("=== 📊 [Excel] 传给 Excel 的数据 ===");
      console.log("Exporter:", {
        name: fullData.exporterName,
        address: fullData.exporterAddr,
        phone: fullData.exporterPhone,
        email: fullData.exporterEmail,
        web: fullData.exporterWeb,
      });
      console.log("Factory:", {
        name: fullData.factoryName,
        address: fullData.factoryAddr,
        email: fullData.factoryEmail,
        web: fullData.fatoryWeb,
        phone: fullData.factoryPhone,
      });
      console.log("Bank:", {
        beneficiary: fullData.bankBeneficiary,
        accountNo: fullData.bankAccountNo,
        bankName: fullData.bankName,
        bankAddr: fullData.bankAddr,
      });
      console.log("Tenant:", {
        name: tenant?.name,
        address: tenant?.address,
        website: tenant?.website,
        bankInfo: tenant?.bankInfo,
      });
      console.log("=====================================");

      return await generateQuotationExcel(fullData);
    } catch (e) {
      console.error(
        "[⚠️] Excel generation failed (Email will be sent without attachment):",
        e
      );
      return undefined;
    }
  }

  /**
   * 🗺️ 数据映射：模型 -> Excel 结构
   */
  private mapToExcelData(
    inquiry: Inquiry,
    siteProduct: SiteProduct,
    siteSku: SiteSku,
    exporter: Exporter,
    factories: Factory[],
    tenant: any,
    siteWeb: string,
    photo: any
  ) {
    const mainFactory = factories[0];
    const clientName = InquiryService.extractUsernameFromEmail(
      inquiry.customerEmail
    );

    return {
      // Exporter (优先使用数据库中的值)
      exporterName: exporter.name,
      exporterAddr: exporter.address,
      exporterPhone: Number.parseInt(exporter.contactPhone || "0", 10),
      exporterEmail: exporter.email,
      exporterWeb: siteWeb,

      // Factory (Dynamic Mapping - 优先使用数据库中的值)
      factoryName: mainFactory.name,
      factoryAddr: mainFactory.address,
      factoryEmail: mainFactory.email,
      fatoryWeb: siteWeb, // Keeping typo as per template requirement
      // Factory Address & Web Slots (Safe Fallback)
      factoryAddr1: factories[0]?.address || "",
      factoryAddr2: factories[1]?.address || "",
      factoryAddr3: factories[2]?.address || "",
      factoryWeb1: tenant?.website || "",
      factoryWeb2: "",
      factoryWeb3: "",
      factoryPhone: mainFactory?.contactPhone || "",

      // Client
      clientCompanyName: inquiry.customerCompany || "",
      clientFullName: inquiry.customerName || clientName,
      clientUserName: clientName,
      clientEmail: inquiry.customerEmail,
      clientPhone: Number.parseInt(inquiry.customerPhone || "0", 10),
      clientWhatsApp: inquiry.customerWhatsapp || "",

      // Product / Terms
      photoForRefer: photo,
      termsCode1: siteSku?.sku.skuCode || "-",
      termsDesc1: inquiry.productDescription || siteProduct.siteName || "",
      termsUnits1: "PAIR",
      termsUsd1: String(inquiry.price || 0),
      termsRemark1: inquiry.customerRequirements || "",
      termsTTL: inquiry.quantity,
      termsUSD: Number(inquiry.price || 0) * inquiry.quantity,

      // Metadata
      date: new Date().toISOString().split("T")[0],
      timeNo: inquiry.inquiryNum,
      payWay: `Payment Method: ${inquiry.paymentMethod || "TBD"}`,
      exporterBehalf: "Michael Tse", // Could be parameterized if needed
    };
  }

  /**
   * 🏢 获取出口商、工厂和租户信息
   *
   * 逻辑：
   * - 如果当前站点是工厂站点，只返回当前工厂
   * - 如果当前站点是出口商站点，返回所有子工厂
   * - 同时获取租户信息（银行信息等）
   * - 获取出口商和工厂绑定的用户邮箱
   */
  private async getExporterAndFactoryInfo(siteId: string) {
    const site = await db.query.siteTable.findFirst({
      where: { id: siteId },
      with: { department: true },
    });

    if (!site?.department)
      return { exporter: null, factories: [], tenant: null };

    // 并行获取出口商/工厂信息和租户信息
    const [tenant] = await Promise.all([
      db.query.tenantTable.findFirst({
        where: { id: site.tenantId },
        columns: {
          id: true,
          name: true,
          address: true,
          website: true,
          bankInfo: true,
        },
      }),
    ]);

    let exporter = null;
    let factories = [];

    if (site.siteType === "group") {
      // 出口商站点：返回所有子工厂
      exporter = site.department;
      factories = await db.query.departmentTable.findMany({
        where: { parentId: exporter.id, category: "factory", isActive: true },
      });
    } else {
      // 工厂站点：只返回当前工厂
      if (site.department.parentId) {
        exporter = await db.query.departmentTable.findFirst({
          where: { id: site.department.parentId },
        });
      }
      factories = [site.department]; // 只返回当前工厂
    }

    // 📧 获取出口商和工厂的用户邮箱
    const [exporterAdminEmail, ...factoryAdminEmails] = await Promise.all([
      // 出口商管理员邮箱（出口商管理员角色）
      this.getExporterAdminEmail(exporter?.id, site.tenantId),
      // 各工厂的用户邮箱
      ...factories.map((f) => this.getDeptUserEmail(f.id)),
    ]);

    // 将邮箱添加到对应的对象中
    const exporterWithEmail: (typeof exporter & ExporterInfo) | null = exporter
      ? {
          ...exporter,
          email: exporterAdminEmail,
        }
      : null;

    const factoriesWithEmail: ((typeof factories)[0] & FactoryInfo)[] =
      factories.map((f, i) => ({
        ...f,
        email: factoryAdminEmails[i],
      }));

    return {
      exporter: exporterWithEmail,
      factories: factoriesWithEmail,
      tenant,
    };
  }

  /**
   * 📧 批量获取工厂管理员邮箱
   */
  private async resolveFactoryEmails(factories: any[]): Promise<string[]> {
    return Promise.all(factories.map((f) => this.getFactoryAdminEmail(f.id)));
  }

  // --- Utility Methods ---

  private async getProductMasterCategories(
    productId: string
  ): Promise<string[]> {
    const cats = await db.query.productMasterCategoryTable.findMany({
      where: { productId },
    });
    return cats.length ? cats.map((c) => c.masterCategoryId) : [];
  }

  private async updateSalesRepLastAssigned(id: string, tx: TxType) {
    await tx
      .update(salesResponsibilityTable)
      .set({ lastAssignedAt: new Date() })
      .where(eq(salesResponsibilityTable.id, id));
  }

  private async upsertCustomer(body: any, tenantId: string, tx: TxType) {
    const existing = await tx.query.customerTable.findFirst({
      where: {
        email: body.customerEmail,
      },
    });

    const data = {
      companyName: body.customerCompany,
      name: body.customerName,
      email: body.customerEmail,
      phone: body.customerPhone,
      whatsapp: body.customerWhatsapp,
      tenantId,
    };

    if (existing) {
      await tx
        .update(customerTable)
        .set(data)
        .where(eq(customerTable.id, existing.id));
    } else {
      await tx.insert(customerTable).values(data);
    }
  }

  /**
   * 🛠️ 静态工具：从邮箱提取用户名
   */
  public static extractUsernameFromEmail(email: string): string {
    return email?.split("@")[0] || "";
  }

  /**
   * 🛠️ 静态工具：转换 Inquiry 为邮件模板所需的 Items 格式
   */
  public static transformInquiry(inquiry: any) {
    return {
      ...inquiry,
      items: [
        {
          productName: inquiry.productName || "",
          productDescription: inquiry.productDescription || "",
          skuQuantity: inquiry.quantity,
          skuPrice: inquiry.price?.toString() || "",
          customerRequirements: inquiry.customerRequirements || "",
        },
      ],
    };
  }

  private async downloadImage(
    url?: string
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!url) return null;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      return {
        buffer: Buffer.from(await resp.arrayBuffer()),
        mimeType: resp.headers.get("content-type") || "image/jpeg",
      };
    } catch {
      return null;
    }
  }

  /**
   * 👥 获取需要抄送的管理员
   *
   * 查询并返回出口商管理员和工厂管理员的邮箱列表
   *
   * 角色名称：
   * - 出口商管理员：角色名 "出口商管理员"
   * - 工厂管理员：角色名 "工厂管理员"（已注释，需要时启用）
   *
   * @param tenantId - 租户ID（出口商）
   * @param factoryDeptId - 工厂部门ID（将来启用工厂管理员时需要）
   * @returns 管理员邮箱列表（出口商和工厂）
   */
  private async getAdminEmails(
    tenantId: string,
    factoryDeptId: string
  ): Promise<string[]> {
    const adminEmails: string[] = [];

    try {
      // 1. 获取出口商管理员（角色名：出口商管理员）
      const [tenantAdminRole] = await db
        .select()
        .from(roleTable)
        .where(eq(roleTable.name, "出口商管理员"))
        .limit(1);

      if (tenantAdminRole) {
        const tenantAdmins = await db
          .select({
            email: userTable.email,
            name: userTable.name,
          })
          .from(userTable)
          .innerJoin(userRoleTable, eq(userRoleTable.userId, userTable.id))
          .where(
            and(
              eq(userRoleTable.roleId, tenantAdminRole.id),
              eq(userTable.tenantId, tenantId),
              eq(userTable.isActive, true)
            )
          );

        for (const admin of tenantAdmins) {
          if (admin.email && !adminEmails.includes(admin.email)) {
            adminEmails.push(admin.email);
            console.log(`[📋] 出口商管理员: ${admin.name} (${admin.email})`);
          }
        }
      }

      console.log(`[✅] 找到 ${adminEmails.length} 个出口商管理员需要抄送`);
      // 2. 获取工厂管理员（角色名：工厂管理员）- 只查询当前工厂的管理员
      // 将来需要启用时，取消下面代码的注释
      // const [deptManagerRole] = await db
      //   .select()
      //   .from(roleTable)
      //   .where(eq(roleTable.name, "工厂管理员"))
      //   .limit(1);

      // if (deptManagerRole) {
      //   const deptManagers = await db
      //     .select({
      //       email: userTable.email,
      //       name: userTable.name,
      //     })
      //     .from(userTable)
      //     .innerJoin(
      //       userRoleTable,
      //       eq(userRoleTable.userId, userTable.id)
      //     )
      //     .where(
      //       and(
      //         eq(userRoleTable.roleId, deptManagerRole.id),
      //         eq(userTable.deptId, factoryDeptId),
      //         eq(userTable.isActive, true)
      //       )
      //     );

      //   for (const admin of deptManagers) {
      //     if (admin.email && !adminEmails.includes(admin.email)) {
      //       adminEmails.push(admin.email);
      //       console.log(`[🏭] 工厂管理员: ${admin.name} (${admin.email})`);
      //     }
      //   }
      // }
    } catch (error) {
      console.error("[❌] 获取出口商管理员列表失败:", error);
    }

    return adminEmails;
  }

  /**
   * 📧 获取出口商管理员邮箱
   *
   * 查询出口商部门的管理员（角色名：出口商管理员）
   *
   * @param exporterDeptId - 出口商部门ID
   * @param tenantId - 租户ID
   * @returns 出口商管理员邮箱（第一个）或空字符串
   */
  private async getExporterAdminEmail(
    exporterDeptId: string | undefined,
    tenantId: string
  ): Promise<string> {
    if (!exporterDeptId) return "";

    try {
      const [deptManagerRole] = await db
        .select()
        .from(roleTable)
        .where(eq(roleTable.name, "出口商管理员"))
        .limit(1);

      if (!deptManagerRole) {
        // 如果没有"出口商管理员"角色，尝试获取该部门的管理员
        return await this.getDeptUserEmail(exporterDeptId);
      }

      const [deptManager] = await db
        .select({
          email: userTable.email,
          name: userTable.name,
        })
        .from(userTable)
        .innerJoin(userRoleTable, eq(userRoleTable.userId, userTable.id))
        .where(
          and(
            eq(userRoleTable.roleId, deptManagerRole.id),
            eq(userTable.deptId, exporterDeptId),
            eq(userTable.isActive, true)
          )
        )
        .limit(1);

      if (deptManager?.email) {
        console.log(
          `[📋] 找到出口商管理员: ${deptManager.name} (${deptManager.email})`
        );
        return deptManager.email;
      }

      return await this.getDeptUserEmail(exporterDeptId);
    } catch (error) {
      console.error("[❌] 获取出口商管理员邮箱失败:", error);
      return "";
    }
  }

  /**
   * 📧 获取部门用户邮箱（获取该部门的第一个活跃用户）
   *
   * @param deptId - 部门ID
   * @returns 用户邮箱或空字符串
   */
  private async getDeptUserEmail(deptId: string): Promise<string> {
    try {
      const [user] = await db
        .select({
          email: userTable.email,
          name: userTable.name,
        })
        .from(userTable)
        .where(and(eq(userTable.deptId, deptId), eq(userTable.isActive, true)))
        .limit(1);

      if (user?.email) {
        return user.email;
      }
      return "";
    } catch (error) {
      console.error("[❌] 获取部门用户邮箱失败:", error);
      return "";
    }
  }

  /**
   * 🏭 获取单个工厂的管理员邮箱
   *
   * 查询指定工厂部门的管理员（角色名：工厂管理员）
   *
   * @param factoryDeptId - 工厂部门ID
   * @returns 工厂管理员邮箱（第一个）或空字符串
   */
  private async getFactoryAdminEmail(factoryDeptId: string): Promise<string> {
    try {
      const [deptManagerRole] = await db
        .select()
        .from(roleTable)
        .where(eq(roleTable.name, "工厂管理员"))
        .limit(1);

      if (!deptManagerRole) {
        console.log(`[⚠️] 未找到"工厂管理员"角色`);
        return "";
      }

      const [deptManager] = await db
        .select({
          email: userTable.email,
          name: userTable.name,
        })
        .from(userTable)
        .innerJoin(userRoleTable, eq(userRoleTable.userId, userTable.id))
        .where(
          and(
            eq(userRoleTable.roleId, deptManagerRole.id),
            eq(userTable.deptId, factoryDeptId),
            eq(userTable.isActive, true)
          )
        )
        .limit(1);

      if (deptManager?.email) {
        console.log(
          `[🏭] 找到工厂管理员: ${deptManager.name} (${deptManager.email})`
        );
        return deptManager.email;
      }

      console.log(`[⚠️] 工厂 ${factoryDeptId} 没有管理员`);
      return "";
    } catch (error) {
      console.error("[❌] 获取工厂管理员邮箱失败:", error);
      return "";
    }
  }

  /**
   * 🎨 [还原逻辑] 识别颜色属性键
   * 寻找与商品关联的模板中，代表“颜色”的属性 Key
   */
  private async identifyColorAttribute(productId: string) {
    // 1. 找到商品关联的模板
    const [productTemplate] = await db
      .select()
      .from(productTemplateTable)
      .where(eq(productTemplateTable.productId, productId))
      .limit(1);

    if (!productTemplate) return null;

    // 2. 查找该模板下所有的 SKU 规格属性
    const keys = await db
      .select()
      .from(templateKeyTable)
      .where(
        and(
          eq(templateKeyTable.templateId, productTemplate.templateId),
          eq(templateKeyTable.isSkuSpec, true)
        )
      );

    // 3. 正则匹配 "color", "颜色", "colour"
    const colorKey = keys.find((k) => /color|颜色|colour/i.test(k.key));

    return colorKey ? { key: colorKey.key, keyId: colorKey.id } : null;
  }

  /**
   * 🎨 [还原逻辑] 获取属性具体值的 ID
   * 根据 KeyID 和 文本值（如 "Red"），找到对应的 ValueID
   */
  private async getAttributeValueId(keyId: string, valueStr: string) {
    if (!valueStr) return null;

    // 在 templateValueTable 中查找对应的值
    // 注意：这里假设 value 是精确匹配。如果数据库存的是 "Red " 而传入 "Red"，可能需要 trim
    const [val] = await db
      .select()
      .from(templateValueTable)
      .where(
        and(
          eq(templateValueTable.templateKeyId, keyId),
          eq(templateValueTable.value, valueStr) // 或者使用 like 模糊匹配
        )
      )
      .limit(1);

    return val ? val.id : null;
  }
}
// 3. 关键：在文件末尾导出类型，完全不需要手写 interface
export type InquiryWithItems = ReturnType<
  typeof InquiryService.transformInquiry
>;
