/**
 * ✍️ 【WEB Service - 业务自定义】
 * --------------------------------------------------------
 * 💡 处理复杂的询价提交流程：客户管理、媒体保存、Excel生成、邮件分发。
 * 📊 重构说明：
 *    - 移除 salespersonTable，改用 userTable + salesResponsibilityTable
 *    - 匹配逻辑：通过 salesResponsibilityTable 轮询分配业务员
 *    - 支持多租户、站点隔离
 *    - 使用 siteProduct 和 siteSku 替代直接查询 product 和 sku
 * --------------------------------------------------------
 */

import { HttpError } from "@pori15/logixlysia";
import {
  customerTable,
  departmentTable,
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
import { generateInquiryNumber } from "~/modules/inquiry/services/dayCount";
import { generateQuotationExcel } from "~/modules/inquiry/services/excel.service";
import { createSalesInquiryTemplate } from "~/modules/inquiry/services/inquiry.templates";
import { sendEmail } from "~/utils/email/email";
import { sendSalesInquiryEmailViaResend } from "~/utils/email/email-resend/inquiry-resend";

// 外部业务工具

// 类型定义
type TransactionFn = Parameters<(typeof db)["transaction"]>[0];
type TxType = Parameters<TransactionFn>[0];

type UserWithResponsibility = Awaited<
  ReturnType<typeof InquiryService.prototype.findBestSalesperson>
>;
type validateAndGetSkuData = Awaited<
  ReturnType<typeof InquiryService.prototype.validateAndGetSkuData>
>;

type Inquiry = typeof inquiryTable.$inferSelect;
type SiteSku = validateAndGetSkuData["siteSku"];
type SiteProduct = validateAndGetSkuData["siteProduct"];

// 📊 出口商和工厂信息类型
type ExporterInfo = {
  id: string;
  name: string;
  address?: string | null;
  contactPhone?: string | null;
};

type FactoryInfo = {
  id: string;
  name: string;
  address?: string | null;
  contactPhone?: string | null;
};

type ExporterAndFactory = {
  exporter: ExporterInfo | null;
  factories: FactoryInfo[];
};

/**
 * 询价服务类
 */
export class InquiryService {
  /**
   * 🚀 询价提交：事务处理 + 分单逻辑
   *
   * 流程：
   * 1. 验证并获取站点商品和SKU数据
   * 2. 获取商品的主分类ID列表
   * 3. 开启事务
   * 4. 客户管理 (Upsert)
   * 5. 生成业务单号
   * 6. 匹配业务员（通过 salesResponsibilityTable 轮询）
   * 7. 创建询价记录
   * 8. 更新业务员最后分配时间
   * 9. 事务外异步发送邮件
   */
  async submit(
    body: typeof InquiryContract.Create.static,
    ctx: ServiceContext
  ) {
    const { site } = ctx;

    const siteId = site.id;
    const tenantId = site.tenantId;
    // 1. 验证并获取站点商品和SKU信息
    const { siteProduct, siteSku, skuMediaMainID } =
      await this.validateAndGetSkuData(body, ctx);

    if (!siteSku) {
      throw new HttpError.BadRequest("SKU not found");
    }

    // 2. 获取商品的主分类（用于匹配业务员）
    const masterCategoryIds = await this.getProductMasterCategories(
      siteProduct.productId,
      ctx
    );

    // 3. 开启事务处理核心业务逻辑
    const result = await db.transaction(async (tx) => {
      // 4. 客户管理 (Upsert)
      await this.upsertCustomer(body, ctx, tx);

      // 5. 生成业务单号
      const inquiryNum = await generateInquiryNumber();

      // 6. 匹配业务员（轮询逻辑）
      const targetRep = await this.findBestSalesperson(
        masterCategoryIds,
        ctx,
        tx
      );

      // 7. 创建询价主表
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
          siteSkuId: siteSku!.id,

          productName: siteProduct.siteName!,
          productDescription: siteProduct.siteDescription ?? "",

          quantity: body.quantity,
          price: siteSku.price,
          paymentMethod: body.paymentMethod,
          customerRequirements: body.customerRequirements,
          masterCategoryId: masterCategoryIds[0], // 用于后续匹配

          ownerId: targetRep?.userId, // 分配给业务员
          isPublic: !!targetRep,
          siteId,
          tenantId,
          createdBy: targetRep?.userId,
        })
        .returning();

      // 8. 更新业务员最后分配时间（防止连续分配）
      if (targetRep) {
        await this.updateSalesRepLastAssigned(targetRep.id, tx);
      }

      return {
        targetRep,
        inquiry: newInquiry,
        siteProduct,
        siteSku,
        skuMediaMainID,
      };
    });

    // 9. 事务外：异步执行耗时任务（邮件、Excel）
    console.log("=== 📧 检查是否需要发送邮件 ===");
    console.log(
      "[业务员匹配结果]:",
      result.targetRep
        ? {
          userId: result.targetRep.userId,
          userName: result.targetRep.user?.name,
          userEmail: result.targetRep.user?.email,
          responsibilityId: result.targetRep.id,
        }
        : "未匹配到业务员"
    );

    if (result.targetRep) {
      console.log("[✅] 开始异步发送邮件流程");
      // this.sendFullInquiryEmail(
      //   result.targetRep,
      //   result.inquiry,
      //   result.siteProduct,
      //   result.siteSku,
      //   result.skuMediaMainID!,
      //   body
      // ).catch(console.error);

      this.sendFullInquiryEmailViaResend(
        result.targetRep,
        result.inquiry,
        result.siteProduct,
        result.siteSku,
        result.skuMediaMainID!,
        body
      ).catch(console.error);

    } else {
      console.log("[⚠️] 未匹配到业务员，询价单进入公海，不发送邮件");
    }

    return {
      success: true,
      inquiryNumber: result.inquiry.inquiryNum,
      assignedTo: result.targetRep?.user?.name || "Public Pool",
    };
  }

  /**
   * 🔍 验证并获取SKU数据
   *
   * 验证逻辑：
   * - 验证 productId 是否在当前站点有对应的 siteProduct
   * - 验证 skuId 是否存在且属于该 siteProduct
   * - 获取 SKU 的主图媒体（支持三级继承：SKU专属 > 变体级 > 商品级）
   */
  async validateAndGetSkuData(
    body: typeof InquiryContract.Create.static,
    ctx: ServiceContext
  ) {
    const { site } = ctx;
    const siteId = site.id;

    // 获取站点商品（必须属于当前站点）
    const siteProduct = await db.query.siteProductTable.findFirst({
      where: {
        id: body.siteProductId,
        siteId, // ✅ 添加站点隔离，防止跨站点访问
      },
      with: {
        product: {
          with: {
            // 🔥 新增：查询商品级媒体
            media: true,
            // 🔥 新增：查询变体媒体
            variantMedia: {
              with: {
                media: true,
                attributeValue: true,
              },
            },
          },
        },
      },
    });

    if (!siteProduct) {
      throw new HttpError.BadRequest("Product not found in this site");
    }

    // 如果没有提供 siteSkuId，返回空值（支持没有 SKU 的商品）
    if (!body.siteSkuId) {
      return { siteProduct, siteSku: null, skuMediaMainID: undefined };
    }

    // 获取站点SKU（必须属于当前站点的商品）
    const siteSku = await db.query.siteSkuTable.findFirst({
      where: {
        id: body.siteSkuId,
        siteProductId: body.siteProductId, // ✅ 验证 SKU 属于该站点的商品
      },
      with: {
        sku: {
          with: {
            media: true,
          },
        },
      },
    });

    if (!siteSku) {
      throw new HttpError.BadRequest("SKU not found");
    }

    // 🔥 识别颜色属性（复用 SiteProductService 的逻辑）
    const identifyColorAttribute = async () => {
      const [productTemplate] = await db
        .select()
        .from(productTemplateTable)
        .where(eq(productTemplateTable.productId, siteProduct.productId));

      if (!productTemplate) return null;

      const keys = await db
        .select()
        .from(templateKeyTable)
        .where(
          and(
            eq(templateKeyTable.templateId, productTemplate.templateId),
            eq(templateKeyTable.isSkuSpec, true)
          )
        );

      const colorKey = keys.find((k) => /color|颜色|colour/i.test(k.key));
      return colorKey ? { key: colorKey.key, keyId: colorKey.id } : null;
    };

    const colorAttr = await identifyColorAttribute();

    // 🔥 构建颜色值到 attributeValueId 的映射
    const colorValueToIdMap = new Map<string, string>();
    if (colorAttr) {
      const values = await db
        .select()
        .from(templateValueTable)
        .where(eq(templateValueTable.templateKeyId, colorAttr.keyId));

      values.forEach((v) => {
        colorValueToIdMap.set(v.value, v.id);
      });
    }

    // 🔥 三级继承逻辑：获取 SKU 的所有有效媒体 ID
    const specs = siteSku.sku.specJson as Record<string, string>;
    const ownMediaIds = siteSku.sku.media.map((m) => m.id);

    let inheritedMediaIds: string[] = [];
    if (colorAttr && colorValueToIdMap.size > 0) {
      const colorValue = specs[colorAttr.key] || specs.颜色;
      if (colorValue) {
        const attributeValueId = colorValueToIdMap.get(colorValue);
        if (attributeValueId) {
          inheritedMediaIds =
            siteProduct.product.variantMedia
              ?.filter((vm) => vm.attributeValueId === attributeValueId)
              .map((vm) => vm.mediaId) || [];
        }
      }
    }

    const productMediaIds = siteProduct.product.media.map((m) => m.id);

    // 合并所有有效的媒体 ID（优先级：SKU专属 > 变体级 > 商品级）
    const allValidMediaIds = Array.from(
      new Set([...ownMediaIds, ...inheritedMediaIds, ...productMediaIds])
    );

    // 获取SKU媒体（主图）- 使用三级继承逻辑
    let skuMediaMainID = body.skuMediaId;

    // 如果前端传的 mediaId 无效，使用第一个有效媒体 ID
    if (!(skuMediaMainID && allValidMediaIds.includes(skuMediaMainID))) {
      // 优先使用 SKU 专属媒体的第一张图
      if (ownMediaIds.length > 0) {
        skuMediaMainID = ownMediaIds[0];
      }
      // 其次使用变体级媒体的第一张图
      else if (inheritedMediaIds.length > 0) {
        skuMediaMainID = inheritedMediaIds[0];
      }
      // 最后使用商品级媒体的第一张图
      else if (productMediaIds.length > 0) {
        skuMediaMainID = productMediaIds[0];
      } else {
        throw new HttpError.BadRequest("SKU has no media");
      }
    }

    // 🔥 新的验证逻辑：使用 allValidMediaIds 而非只检查 SKU 专属媒体
    if (!allValidMediaIds.includes(skuMediaMainID)) {
      throw new HttpError.BadRequest("SKU media not found");
    }

    return { siteProduct, siteSku, skuMediaMainID };
  }

  /**
   * 🔍 获取商品的主分类ID列表
   *
   * 通过 productMasterCategoryTable 查询商品关联的所有主分类
   */
  private async getProductMasterCategories(
    productId: string,
    ctx: ServiceContext
  ): Promise<string[]> {
    console.log("=== 🔍 开始查询商品主分类 ===");
    console.log("[商品ID]:", productId);

    // 查询商品的主分类
    const productCategories =
      await db.query.productMasterCategoryTable.findMany({
        where: {
          productId,
        },
      });

    console.log("[查询结果数量]:", productCategories.length);
    console.log(
      "[查询结果详情]:",
      productCategories.map((pc) => ({
        productId: pc.productId,
        masterCategoryId: pc.masterCategoryId,
      }))
    );

    if (!productCategories.length) {
      console.error("[❌] 商品没有分配主分类！");
      throw new HttpError.BadRequest("Product has no category assigned");
    }

    const categoryIds = productCategories.map((pc) => pc.masterCategoryId);
    console.log("[✅] 找到主分类ID列表]:", categoryIds);
    return categoryIds;
  }

  /**
   * 🔍 匹配算法：分类优先 + 轮询（Round Robin）
   *
   * 逻辑：
   * 1. 通过 salesResponsibilityTable 找到负责这些分类的所有业务员
   * 2. 过滤出 isAutoAssign = true 的
   * 3. 关联 user 表，过滤 isActive = true 的
   * 4. 按照 lastAssignedAt 升序排序，取最早被分配的那个（最闲）
   *
   * @param masterCategoryIds - 商品的主分类ID列表
   * @param ctx - 服务上下文
   * @param tx - 数据库事务对象
   * @returns 业务员责任关系对象，包含 user 信息
   */
  async findBestSalesperson(
    masterCategoryIds: string[],
    ctx: ServiceContext,
    tx: TxType
  ) {
    const { site } = ctx;
    const tenantId = site.tenantId;

    console.log("=== 👥 开始匹配业务员 ===");
    console.log("[租户ID]:", tenantId);
    console.log("[主分类ID列表]:", masterCategoryIds);

    // 查询这些分类下的所有业务员责任关系
    const responsibilities = await tx.query.salesResponsibilityTable.findMany({
      where: {
        masterCategoryId: {
          in: masterCategoryIds,
        },
        tenantId,
        isAutoAssign: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    console.log("[查询到的责任关系数量]:", responsibilities.length);
    console.log(
      "[责任关系详情]:",
      responsibilities.map((r) => ({
        responsibilityId: r.id,
        masterCategoryId: r.masterCategoryId,
        userId: r.userId,
        isAutoAssign: r.isAutoAssign,
        userName: r.user?.name,
        userEmail: r.user?.email,
        userIsActive: r.user?.isActive,
      }))
    );

    // 过滤掉非活跃用户（安全检查：user 可能为 undefined）
    const activeReps = responsibilities.filter((r) => r.user?.isActive === true);
    console.log("[过滤后活跃业务员数量]:", activeReps.length);

    if (activeReps.length === 0) {
      console.log("[⚠️] 没有找到活跃的业务员，询价单进入公海");
      return null; // 没有找到业务员，进公海
    }

    // 按 lastAssignedAt 升序排序（最闲的排前面）
    // 如果 lastAssignedAt 为 null，视为最早（从未分配过）
    const sorted = activeReps.sort((a, b) => {
      const timeA = a.lastAssignedAt ? a.lastAssignedAt.getTime() : 0;
      const timeB = b.lastAssignedAt ? b.lastAssignedAt.getTime() : 0;
      return timeA - timeB;
    });

    console.log(
      "[排序后候选业务员]:",
      sorted.map((r, idx) => ({
        排名: idx + 1,
        姓名: r.user?.name,
        邮箱: r.user?.email,
        最后分配时间: r.lastAssignedAt,
      }))
    );

    const selected = sorted[0];
    console.log("[✅] 选中的业务员]:", {
      name: selected.user?.name,
      email: selected.user?.email,
      responsibilityId: selected.id,
    });

    return selected; // 返回最闲的业务员
  }

  /**
   * 📧 更新业务员最后分配时间
   *
   * 更新 salesResponsibilityTable 中的 lastAssignedAt 字段
   * 防止连续将询价单分配给同一个业务员
   */
  private async updateSalesRepLastAssigned(
    responsibilityId: string,
    tx: TxType
  ) {
    await tx
      .update(salesResponsibilityTable)
      .set({ lastAssignedAt: new Date() })
      .where(eq(salesResponsibilityTable.id, responsibilityId));
  }

  /**
   * 👤 客户 Upsert 逻辑
   *
   * 如果客户邮箱已存在则更新，否则创建新客户
   */
  private async upsertCustomer(
    body: typeof InquiryContract.Create.static,
    ctx: ServiceContext,
    tx: TxType
  ) {
    const { site } = ctx;
    const tenantId = site.tenantId;

    const [existing] = await tx
      .select()
      .from(customerTable)
      .where(eq(customerTable.email, body.customerEmail))
      .limit(1);

    const customerData = {
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
        .set(customerData)
        .where(eq(customerTable.id, existing.id));
      return existing.id;
    }

    const [newCustomer] = await tx
      .insert(customerTable)
      .values(customerData)
      .returning();
    return newCustomer.id;
  }

  /**
   * 👥 获取需要抄送的管理员
   *
   * 查询并返回出口商管理员和工厂管理员的邮箱列表
   *
   * @param tenantId - 租户ID（出口商）
   * @param factoryDeptId - 工厂部门ID
   * @returns 管理员邮箱列表
   */
  private async getAdminEmails(
    tenantId: string,
    factoryDeptId: string
  ): Promise<string[]> {
    const adminEmails: string[] = [];

    try {
      // 1. 获取出口商管理员（tenant_admin）
      const [tenantAdminRole] = await db
        .select()
        .from(roleTable)
        .where(eq(roleTable.name, "tenant_admin"))
        .limit(1);

      if (tenantAdminRole) {
        const tenantAdmins = await db
          .select({
            email: userTable.email,
            name: userTable.name,
          })
          .from(userTable)
          .innerJoin(
            userRoleTable,
            eq(userRoleTable.userId, userTable.id)
          )
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

      // 2. 获取工厂管理员（dept_manager）- 只查询当前工厂的管理员
      const [deptManagerRole] = await db
        .select()
        .from(roleTable)
        .where(eq(roleTable.name, "dept_manager"))
        .limit(1);

      if (deptManagerRole) {
        const deptManagers = await db
          .select({
            email: userTable.email,
            name: userTable.name,
          })
          .from(userTable)
          .innerJoin(
            userRoleTable,
            eq(userRoleTable.userId, userTable.id)
          )
          .where(
            and(
              eq(userRoleTable.roleId, deptManagerRole.id),
              eq(userTable.deptId, factoryDeptId),
              eq(userTable.isActive, true)
            )
          );

        for (const admin of deptManagers) {
          if (admin.email && !adminEmails.includes(admin.email)) {
            adminEmails.push(admin.email);
            console.log(`[🏭] 工厂管理员: ${admin.name} (${admin.email})`);
          }
        }
      }

      console.log(`[✅] 找到 ${adminEmails.length} 个管理员需要抄送`);
    } catch (error) {
      console.error("[❌] 获取管理员列表失败:", error);
    }

    return adminEmails;
  }

  /**
   * 🏢 根据站点类型获取出口商和工厂信息
   *
   * 逻辑：
   * - 集团站 (siteType = "group")：boundDeptId 就是出口商（总部）
   * - 工厂站 (siteType = "factory")：boundDeptId 的 parent 才是出口商
   *
   * @param siteId - 站点ID
   * @returns 出口商和工厂信息
   */
  private async getExporterAndFactoryInfo(
    siteId: string
  ): Promise<ExporterAndFactory> {
    console.log("[🏢] 开始获取出口商和工厂信息，站点ID:", siteId);

    // 1. 查询站点及其绑定部门
    const site = await db.query.siteTable.findFirst({
      where: { id: siteId },
      with: { department: true },
    });

    if (!site?.department) {
      console.warn("[⚠️] 未找到站点或绑定部门");
      return { exporter: null, factories: [] };
    }

    console.log("[📍] 站点类型:", site.siteType);
    console.log("[📍] 绑定部门:", site.department.name, "类别:", site.department.category);

    let exporter: ExporterInfo | null = null;
    let factories: FactoryInfo[] = [];

    if (site.siteType === "group") {
      // 集团站：boundDeptId 就是出口商（总部）
      console.log("[🏢] 集团站：绑定部门即为出口商");
      exporter = {
        id: site.department.id,
        name: site.department.name,
        address: site.department.address,
        contactPhone: site.department.contactPhone,
      };

      // 查询出口商下的所有工厂（category = "factory" 且 parentId = exporter.id）
      const subFactories = await db.query.departmentTable.findMany({
        where: {
          parentId: exporter.id,
          category: "factory",
          isActive: true,
        },
      });

      factories = subFactories.map((f) => ({
        id: f.id,
        name: f.name,
        address: f.address,
        contactPhone: f.contactPhone,
      }));

      console.log(`[🏭] 找到 ${factories.length} 个子工厂`);
    } else if (site.siteType === "factory") {
      // 工厂站：boundDeptId 的 parent 才是出口商
      console.log("[🏢] 工厂站：需要查找父级部门作为出口商");

      if (!site.department.parentId) {
        console.warn("[⚠️] 工厂站没有父级部门");
        return { exporter: null, factories: [] };
      }

      // 查询父级部门（出口商）
      const exporterDept = await db.query.departmentTable.findFirst({
        where: {
          id: site.department.parentId!,
        },
      });

      if (!exporterDept) {
        console.warn("[⚠️] 未找到父级出口商部门");
        return { exporter: null, factories: [] };
      }

      exporter = {
        id: exporterDept.id,
        name: exporterDept.name,
        address: exporterDept.address,
        contactPhone: exporterDept.contactPhone,
      };

      console.log("[🏢] 找到出口商:", exporter.name);

      // 当前绑定的工厂就是站点绑定的部门
      factories = [
        {
          id: site.department.id,
          name: site.department.name,
          address: site.department.address,
          contactPhone: site.department.contactPhone,
        },
      ];

      // 查询出口商下的所有工厂（包括当前工厂）
      const allFactories = await db.query.departmentTable.findMany({
        where: {
          parentId: exporter.id,
          category: "factory",
          isActive: true,
        },
      });

      console.log(`[🏭] 出口商下共有 ${allFactories.length} 个工厂`);
    }

    console.log("[✅] 出口商信息:", {
      name: exporter?.name,
      phone: exporter?.contactPhone,
      address: exporter?.address,
    });
    console.log("[✅] 工厂列表:", factories.map((f) => ({ name: f.name, phone: f.contactPhone })));

    return { exporter, factories };
  }

  /**
   * 📧 异步完整通知逻辑 (包含 Excel 和工厂逻辑)
   *
   * TODO: 完成以下功能
   * - 获取工厂信息（从站点的绑定部门）
   * - 生成 Excel（需要实现 generateQuotationExcel）
   * - 发送邮件（需要实现 createSalesInquiryTemplate）
   */
  private async sendFullInquiryEmail(
    targetRep: NonNullable<UserWithResponsibility>,
    inquiry: Inquiry,
    siteProduct: SiteProduct,
    siteSku: SiteSku,
    skuMediaId: string,
    body: typeof InquiryContract.Create.static
  ) {
    console.log("=== 🚀 开始发送邮件流程 ===");
    console.log("[1] 询价单号:", inquiry.inquiryNum);
    console.log("[2] 业务员信息:", {
      name: targetRep.user.name,
      email: targetRep.user.email,
      userId: targetRep.user.id,
    });

    try {
      // 1. 🏢 获取出口商和工厂信息（根据站点类型动态获取）
      console.log("[3] 开始获取出口商和工厂信息，站点ID:", inquiry.siteId);
      const { exporter, factories } = await this.getExporterAndFactoryInfo(inquiry.siteId);

      if (!exporter) {
        console.error("[❌] 未找到出口商信息，取消发送邮件");
        return;
      }

      // 使用第一个工厂作为主要工厂（用于邮件模板）
      const mainFactory = factories[0] || null;
      console.log("[4] 出口商信息:", {
        name: exporter.name,
        phone: exporter.contactPhone,
        address: exporter.address,
      });
      console.log("[5] 主工厂信息:", mainFactory ? {
        name: mainFactory.name,
        phone: mainFactory.contactPhone,
        address: mainFactory.address,
      } : "无工厂");

      // 2. 获取需要抄送的管理员（使用主工厂ID）
      console.log("[6] 开始获取管理员列表");
      const adminEmails = mainFactory
        ? await this.getAdminEmails(inquiry.tenantId, mainFactory.id)
        : [];
      console.log("[6.2] 管理员邮箱列表:", adminEmails);

      // 3. 获取 SKU 媒体信息
      console.log("[7] 开始获取媒体信息，媒体ID:", skuMediaId);
      const media = skuMediaId
        ? await db.query.mediaTable.findFirst({
          where: { id: skuMediaId },
        })
        : null;
      console.log(
        "[8] 媒体查询结果:",
        media
          ? {
            id: media.id,
            url: media.url,
            mediaType: media.mediaType,
            mimeType: media.mimeType,
          }
          : "未找到"
      );

      // 3. 下载产品图片（仅当媒体类型为 image 时）
      console.log("[9] 开始下载产品图片");
      const photoData =
        media?.mediaType === "image" && media?.url
          ? await this.downloadImage(media.url)
          : null;

      if (media && media.mediaType !== "image") {
        console.warn(
          `[⚠️] 媒体类型不是图片 (${media.mediaType})，跳过下载`
        );
      }
      console.log("[10] 图片下载结果:", photoData ? "成功" : "失败");

      // 4. 生成 Excel 报价单
      console.log("[11] 准备生成 Excel 报价单");
      let excelBuffer: Buffer | null = null;

      try {
        const quotationData = this.mapToExcelData(
          inquiry,
          siteProduct,
          siteSku,
          exporter,
          factories,
          photoData
        );
        console.log("[12] Excel 数据准备完成");
        console.log("[13] 开始生成 Excel 文件");
        excelBuffer = await generateQuotationExcel(quotationData);
        console.log(
          "[14] Excel 生成完成，大小:",
          excelBuffer?.length || 0,
          "bytes"
        );
      } catch (error) {
        console.warn(
          "[⚠️] Excel 生成失败，将不附加 Excel 文件:",
          error instanceof Error ? error.message : error
        );
        excelBuffer = null;
      }

      // 5. 构建邮件模板
      console.log("[15] 验证业务员邮箱");
      if (!targetRep.user.email) {
        console.error("[❌] 业务员邮箱为空，取消发送");
        return;
      }
      console.log("[16] 邮箱验证通过:", targetRep.user.email);

      // 2. 内部直接调用，逻辑还是只有一份
      const inquiryWithItems = InquiryService.transformInquiry(inquiry);

      console.log("[17] 开始生成邮件模板");
      const emailTemplate = createSalesInquiryTemplate(
        inquiryWithItems,
        inquiry.inquiryNum,
        factories.length > 0
          ? factories.map((f) => ({ name: f.name, address: f.address ?? undefined }))
          : [{ name: "DONG QI FOOTWEAR (JIANGXI) CO., LTD" }],
        {
          name: targetRep.user.name,
          email: targetRep.user.email,
        }
      );
      console.log("[18] 邮件模板生成完成");
      console.log("[19] 邮件主题:", emailTemplate.subject);

      // 6. 发送邮件
      console.log("[20] 开始发送邮件...");

      // 构建附件列表（只在 Excel 生成成功时添加）
      const attachments = excelBuffer
        ? [
          {
            filename: `Quotation-${inquiry.inquiryNum}.xlsx`,
            content: excelBuffer,
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ]
        : [];

      const emailPayload = {
        to: targetRep.user.email,
        bcc: adminEmails.length > 0 ? adminEmails : undefined,
        template: {
          ...emailTemplate,
          attachments,
        },
      };
      console.log("[21] 邮件载荷:", {
        to: emailPayload.to,
        bcc: emailPayload.bcc,
        subject: emailPayload.template.subject,
        hasAttachments: attachments.length > 0,
        attachmentSize: attachments[0]?.content?.length || 0,
      });

      await sendEmail(emailPayload);

      console.log("=== ✅ 邮件发送成功 ===");
      console.log(
        `[Inquiry] Email sent for ${inquiry.inquiryNum} to ${targetRep.user.email}`
      );
      if (adminEmails.length > 0) {
        console.log(
          `[Inquiry] BCC to ${adminEmails.length} admin(s): ${adminEmails.join(", ")}`
        );
      }
    } catch (error) {
      console.error("=== ❌ 邮件发送失败 ===");
      console.error("[错误详情]:", error);
      console.error(
        "[错误堆栈]:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      // 更详细的错误信息
      if (error instanceof Error) {
        console.error("[错误名称]:", error.name);
        console.error("[错误消息]:", error.message);
      }
    }
  }

  /**
   * 📧 使用 Resend 发送询价邮件
   *
   * 与 sendFullInquiryEmail 功能相同，但使用 Resend API 发送邮件
   *
   * 流程：
   * 1. 获取工厂信息（从站点的绑定部门）
   * 2. 获取需要抄送的管理员
   * 3. 获取 SKU 媒体信息
   * 4. 下载产品图片（仅当媒体类型为 image 时）
   * 5. 生成 Excel 报价单
   * 6. 使用 sendSalesInquiryEmailViaResend 发送邮件
   */
  private async sendFullInquiryEmailViaResend(
    targetRep: NonNullable<UserWithResponsibility>,
    inquiry: Inquiry,
    siteProduct: SiteProduct,
    siteSku: SiteSku,
    skuMediaId: string,
    body: typeof InquiryContract.Create.static
  ) {
    console.log("=== 🚀 [Resend] 开始发送邮件流程 ===");
    console.log("[1] 询价单号:", inquiry.inquiryNum);
    console.log("[2] 业务员信息:", {
      name: targetRep.user.name,
      email: targetRep.user.email,
      userId: targetRep.user.id,
    });

    try {
      // 1. 🏢 获取出口商和工厂信息（根据站点类型动态获取）
      console.log("[3] 开始获取出口商和工厂信息，站点ID:", inquiry.siteId);
      const { exporter, factories } = await this.getExporterAndFactoryInfo(inquiry.siteId);

      if (!exporter) {
        console.error("[❌] 未找到出口商信息，取消发送邮件");
        return;
      }

      // 使用第一个工厂作为主要工厂（用于邮件模板）
      const mainFactory = factories[0] || null;
      console.log("[4] 出口商信息:", {
        name: exporter.name,
        phone: exporter.contactPhone,
        address: exporter.address,
      });
      console.log("[5] 主工厂信息:", mainFactory ? {
        name: mainFactory.name,
        phone: mainFactory.contactPhone,
        address: mainFactory.address,
      } : "无工厂");

      // 2. 获取需要抄送的管理员（使用主工厂ID）
      console.log("[6] 开始获取管理员列表");
      const adminEmails = mainFactory
        ? await this.getAdminEmails(inquiry.tenantId, mainFactory.id)
        : [];
      console.log("[6.2] 管理员邮箱列表:", adminEmails);

      // 3. 获取 SKU 媒体信息
      console.log("[7] 开始获取媒体信息，媒体ID:", skuMediaId);
      const media = skuMediaId
        ? await db.query.mediaTable.findFirst({
          where: { id: skuMediaId },
        })
        : null;
      console.log(
        "[8] 媒体查询结果:",
        media
          ? {
            id: media.id,
            url: media.url,
            mediaType: media.mediaType,
            mimeType: media.mimeType,
          }
          : "未找到"
      );

      // 4. 下载产品图片（仅当媒体类型为 image 时）
      console.log("[9] 开始下载产品图片");
      const photoData =
        media?.mediaType === "image" && media?.url
          ? await this.downloadImage(media.url)
          : null;

      if (media && media.mediaType !== "image") {
        console.warn(
          `[⚠️] 媒体类型不是图片 (${media.mediaType})，跳过下载`
        );
      }
      console.log("[10] 图片下载结果:", photoData ? "成功" : "失败");

      // 5. 生成 Excel 报价单
      console.log("[11] 准备生成 Excel 报价单");
      let excelBuffer: Buffer | null = null;

      try {
        const quotationData = this.mapToExcelData(
          inquiry,
          siteProduct,
          siteSku,
          exporter,
          factories,
          photoData
        );
        console.log("[12] Excel 数据准备完成");
        console.log("[13] 开始生成 Excel 文件");
        excelBuffer = await generateQuotationExcel(quotationData);
        console.log(
          "[14] Excel 生成完成，大小:",
          excelBuffer?.length || 0,
          "bytes"
        );
      } catch (error) {
        console.warn(
          "[⚠️] Excel 生成失败，将不附加 Excel 文件:",
          error instanceof Error ? error.message : error
        );
        excelBuffer = null;
      }

      // 6. 验证业务员邮箱
      console.log("[15] 验证业务员邮箱");
      if (!targetRep.user.email) {
        console.error("[❌] 业务员邮箱为空，取消发送");
        return;
      }
      console.log("[16] 邮箱验证通过:", targetRep.user.email);

      // 7. 转换询价数据格式
      const inquiryWithItems = InquiryService.transformInquiry(inquiry);

      console.log("[17] 准备使用 Resend 发送邮件");

      // 8. 使用 Resend 发送邮件（将工厂列表转换为邮件模板需要的格式）
      const factoriesForEmail = factories.map((f) => ({
        name: f.name,
        address: f.address ?? undefined,
      }));

      const result = await sendSalesInquiryEmailViaResend(
        targetRep.user.email,
        adminEmails,
        inquiryWithItems,
        inquiry.inquiryNum,
        factoriesForEmail.length > 0 ? factoriesForEmail : [{ name: "DONG QI FOOTWEAR (JIANGXI) CO., LTD" }],
        {
          name: targetRep.user.name,
          email: targetRep.user.email,
        },
        excelBuffer ?? undefined
      );

      if (result.success) {
        console.log("=== ✅ [Resend] 邮件发送成功 ===");
        console.log(
          `[Inquiry] Email sent for ${inquiry.inquiryNum} to ${targetRep.user.email}`
        );
        if (adminEmails.length > 0) {
          console.log(
            `[Inquiry] BCC to ${adminEmails.length} admin(s): ${adminEmails.join(", ")}`
          );
        }
      } else {
        console.error("=== ❌ [Resend] 邮件发送失败 ===");
        console.error("[错误详情]:", result.error);
      }
    } catch (error) {
      console.error("=== ❌ [Resend] 邮件发送失败 ===");
      console.error("[错误详情]:", error);
      console.error(
        "[错误堆栈]:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      // 更详细的错误信息
      if (error instanceof Error) {
        console.error("[错误名称]:", error.name);
        console.error("[错误消息]:", error.message);
      }
    }
  }

  // 1. 提取这个纯逻辑函数，它是你的"类型源"
  static transformInquiry(inquiry: Inquiry) {
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

  /**
   * 📊 内部方法：将模型数据映射为 Excel 模板所需格式
   *
   * @param inquiry - 询价数据
   * @param siteProduct - 站点产品
   * @param siteSku - 站点 SKU
   * @param exporter - 出口商信息（从数据库动态获取）
   * @param factories - 工厂列表（从数据库动态获取）
   * @param photo - 产品图片
   */
  private mapToExcelData(
    inquiry: Inquiry,
    siteProduct: SiteProduct,
    siteSku: SiteSku,
    exporter: ExporterInfo | null,
    factories: FactoryInfo[],
    photo: any
  ) {
    // 使用第一个工厂作为主工厂，如果没有工厂则使用默认值
    const mainFactory = factories[0] || { name: "DONG QI FOOTWEAR (JIANGXI) CO., LTD" };

    // 🔧 从邮箱前缀提取客户用户名
    const extractUsernameFromEmail = (email: string): string => {
      if (!email) return "";
      const match = email.match(/^([^@]+)@/);
      return match ? match[1] : "";
    };

    return {
      // Exporter (出口商) - 使用从数据库获取的实际数据
      exporterName: exporter?.name || "DONG QI FOOTWEAR INTL MFG CO., LTD",
      exporterAddr: exporter?.address || "No.2 Chiling Road, Chiling Industrial Zone, Houjie, Dongguan, Guangdong, China",
      exporterWeb: "www.dongqifootwear.com",
      exporterEmail: "sales@dongqifootwear.com",
      exporterPhone: exporter?.contactPhone ? Number.parseInt(exporter.contactPhone, 10) || 0 : 0,

      // Factory (工厂) - 使用从数据库获取的实际数据
      factoryName: mainFactory.name,
      factoryAddr1: factories[0]?.address || "Qifu Road #1, ShangOu Industrial Park, Yudu, Ganzhou, Jiangxi,China",
      factoryAddr2: factories[1]?.address || "Industrial Road #3, Shangrao Industrial Zone, Shangrao, Jiangxi,China",
      factoryAddr3: factories[2]?.address || "Qifu Road #2, ShangOu Industrial Park, Yudu, Ganzhou, Jiangxi,China",
      factoryWeb1: "www.dongqishoes.com",
      factoryWeb2: "www.dongqifootwear.com",
      factoryWeb3: "www.dongqifootwear.com",
      factoryPhone: mainFactory?.contactPhone ? Number.parseInt(mainFactory.contactPhone, 10) || 0 : 0,

      // Client (客户)
      clientCompanyName: inquiry.customerCompany || "",
      clientFullName: extractUsernameFromEmail(inquiry.customerEmail), // 🔧 使用邮箱前缀作为客户全名
      clientUserName: extractUsernameFromEmail(inquiry.customerEmail), // 🔧 从邮箱前缀提取用户名
      clientWhatsApp: inquiry.customerWhatsapp || "",
      clientEmail: inquiry.customerEmail,
      clientPhone: inquiry.customerPhone ? Number.parseInt(inquiry.customerPhone, 10) || 0 : 0,
      photoForRefer: photo
        ? {
          // 🔧 确保 buffer 是 Buffer 类型（处理可能从 fetch 返回的 Uint8Array）
          buffer: Buffer.isBuffer(photo.buffer) ? photo.buffer : Buffer.from(photo.buffer),
          mimeType: photo.mimeType,
          name: `ref-${inquiry.inquiryNum}`,
        }
        : null,

      // Terms (报价项) - 使用第一个 SKU 信息填充第一行
      termsCode1: siteSku!.id || null,
      termsDesc1: inquiry.productDescription || siteProduct.product?.name || "",
      termsUnits1: "pcs",
      termsUsd1: inquiry.price ? String(inquiry.price) : "",
      termsRemark1: inquiry.customerRequirements || "",

      termsCode2: null,
      termsDesc2: "",
      termsUnits2: "",
      termsUsd2: 0,
      termsRemark2: "",

      termsCode3: null,
      termsDesc3: "",
      termsUnits3: "",
      termsUsd3: 0,
      termsRemark3: "",
      termsTTL: inquiry.quantity,
      termsUSD: Number(inquiry.price || 0) * inquiry.quantity,

      // Bank Info (银行信息)
      bankBeneficiary: "DONG QI FOOTWEAR INTL MFG CO., LTD",
      bankAccountNo: 0,
      bankName: "BANK OF CHINA",
      bankAddr: "DONGGUAN BRANCH",

      // Signed By (签署代表)
      exporterBehalf: "Michael Tse",
      date: new Date().toISOString().split("T")[0],
      timeNo: inquiry.inquiryNum,
      clientAddr: inquiry.customerCompany || "",
      payWay: `Payment Method: ${inquiry.paymentMethod || "TBD"}`,
    };
  }
  /**
   * 🖼️ 下载图片为 Buffer
   *
   * 从给定的 URL 下载图片并转换为 Buffer
   */
  private async downloadImage(url?: string) {
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
}
// 3. 关键：在文件末尾导出类型，完全不需要手写 interface
export type InquiryWithItems = ReturnType<
  typeof InquiryService.transformInquiry
>;
