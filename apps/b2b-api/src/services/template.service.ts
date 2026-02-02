import { HttpError } from "@pori15/logixlysia";
import {
  productVariantMediaTable,
  type TemplateContract,
  templateKeyTable,
  templateTable,
  templateValueTable,
} from "@repo/contract";
import { asc, eq, inArray, like } from "drizzle-orm";
import type { Transaction } from "~/db/connection";
import { type ServiceContext } from "../lib/type";

export class TemplateService {
  public async create(body: TemplateContract["Create"], ctx: ServiceContext) {
    const { name, masterCategoryId, fields } = body;

    return await ctx.db.transaction(async (tx) => {
      const [templateRes] = await tx
        .insert(templateTable)
        .values({
          sortOrder: body.sortOrder,
          masterCategoryId,
          name,
        })
        .returning();

      if (!templateRes) {
        throw new HttpError.BadRequest(`创建属性模板失败${name}`);
      }

      const templateId = templateRes.id;

      // 2. 处理字段列表
      if (fields && fields.length > 0) {
        for (const field of fields) {
          const { inputType, isRequired, options, value, key, isSkuSpec } =
            field;

          // 🔴 逻辑校验：只有选择类型的属性才能作为 SKU 规格
          if (isSkuSpec && inputType !== "select" && inputType !== "multiselect") {
            throw new HttpError.BadRequest(
              `属性 [${key}] 校验失败：只有选择框类型（select/multiselect）才能设置为 SKU 规格`
            );
          }

          // 2.1 插入属性定义 (templateKeyTable)
          const [newAttribute] = await tx
            .insert(templateKeyTable)
            .values({
              templateId,
              key, // 这里的 key 是 UI 上的 Display Name
              inputType,
              isRequired: !!isRequired,
              isSkuSpec: !!isSkuSpec,
            })
            .returning({ id: templateKeyTable.id });

          // 2.2 根据类型解析 value/options
          if (inputType === "select" || inputType === "multiselect") {
            if (options && Array.isArray(options)) {
              // 使用新的对象格式处理选项
              await this.upsertTemplateValues(newAttribute.id, field, tx);
            } else if (value && typeof value === "string") {
              // 兼容旧格式：逗号分隔的字符串
              const valuesToInsert = value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);
              const valueData = valuesToInsert.map((v, index) => ({
                templateKeyId: newAttribute.id,
                value: v,
                sortOrder: index,
              }));
              await tx.insert(templateValueTable).values(valueData);
            }
          } else if (
            (inputType === "text" || inputType === "number") &&
            value
          ) {
            // 文本/数字类型，value 是 placeholder 或默认值
            const valueData = {
              templateKeyId: newAttribute.id,
              value: String(value).trim(),
              sortOrder: 0,
            };
            await tx.insert(templateValueTable).values([valueData]);
          }
        }
      }

      // 返回符合基类签名的数据结构
      return templateRes;
    });
  }

  public async list(query: TemplateContract["ListQuery"], ctx: ServiceContext) {
    const { search } = query;
    const templates = await ctx.db.query.templateTable.findMany({
      where: {
        ...(search ? { name: { like: `%${search}%` } } : {}),
      },
      with: {
        templateKeys: {
          with: {
            values: {
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        }
      }
    })
    // 将数据库结构映射为 UI 需要的结构
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      masterCategoryId: t.masterCategoryId,
      sortOrder: t.sortOrder,
      fields: t.templateKeys.map((k) => {
        const rawOptions = k.values.map((v) => ({
          id: v.id,
          value: v.value,
        }));

        // 处理逻辑：根据 inputType 格式化输出
        const isSelect = k.inputType === "select" || k.inputType === "multiselect";

        return {
          id: k.id,
          key: k.key,
          inputType: k.inputType,
          isRequired: k.isRequired,
          isSkuSpec: k.isSkuSpec,
          // 如果是选择框，value 显示为逗号分隔的预览，否则取第一个值
          value: isSelect
            ? rawOptions.map((o) => o.value).join(", ")
            : (rawOptions[0]?.value || ""),
          options: isSelect ? rawOptions : [],
        };
      }),
    }));
  }

  public async update(
    id: string,
    body: TemplateContract["Update"],
    ctx: ServiceContext
  ) {
    const { name, masterCategoryId, fields } = body;

    return await ctx.db.transaction(async (tx) => {
      // 1. 更新模板主体
      const updateData = {
        name,
        masterCategoryId,
      };

      const [templateRes] = await tx
        .update(templateTable)
        .set(updateData)
        .where(eq(templateTable.id, id))
        .returning();

      if (!templateRes) {
        throw new HttpError.BadRequest("更新属性模板失败");
      }

      const templateId = templateRes.id;

      // 2. 获取现有字段
      const existingKeys = await tx
        .select()
        .from(templateKeyTable)
        .where(eq(templateKeyTable.templateId, templateId));
      const existingKeyIds = existingKeys.map((k) => k.id);

      // 3. 处理字段列表（支持增量更新）
      if (fields && fields.length > 0) {
        // 3.1 找出提交的 field IDs（有 id 的）
        const submittedFieldIds = fields
          .map((f) => f.id)
          .filter((id): id is string => !!id);
        const fieldIdsToDelete = existingKeyIds.filter(
          (id) => !submittedFieldIds.includes(id)
        );

        // 3.2 删除不再存在的字段
        if (fieldIdsToDelete.length > 0) {
          await tx
            .delete(templateValueTable)
            .where(inArray(templateValueTable.templateKeyId, fieldIdsToDelete));
          await tx
            .delete(templateKeyTable)
            .where(inArray(templateKeyTable.id, fieldIdsToDelete));
        }

        // 3.3 处理每个字段
        for (const field of fields) {
          const {
            id: fieldId,
            inputType,
            isRequired,
            options,
            value,
            key,
            isSkuSpec,
          } = field;

          // 🔴 逻辑校验：只有选择类型的属性才能作为 SKU 规格
          if (isSkuSpec && inputType !== "select" && inputType !== "multiselect") {
            throw new HttpError.BadRequest(
              `属性 [${key}] 校验失败：只有选择框类型（select/multiselect）才能设置为 SKU 规格`
            );
          }
          let keyId: string;

          if (fieldId) {
            // 🔥 更新现有字段
            await tx
              .update(templateKeyTable)
              .set({
                key,
                inputType,
                isRequired: !!isRequired,
                isSkuSpec: !!isSkuSpec,
              })
              .where(eq(templateKeyTable.id, fieldId));
            keyId = fieldId;
          } else {
            // 🔥 创建新字段
            const [newAttribute] = await tx
              .insert(templateKeyTable)
              .values({
                templateId,
                key,
                inputType,
                isRequired: !!isRequired,
                isSkuSpec: !!isSkuSpec,
              })
              .returning({ id: templateKeyTable.id });
            keyId = newAttribute.id;
          }

          // 3.4 处理选项
          if (inputType === "select" || inputType === "multiselect") {
            if (options && Array.isArray(options)) {
              // 使用新的对象格式处理选项（增量更新）
              await this.upsertTemplateValues(keyId, field, tx);
            } else if (value && typeof value === "string") {
              // 兼容旧格式：逗号分隔的字符串（删除重建）
              await tx
                .delete(templateValueTable)
                .where(eq(templateValueTable.templateKeyId, keyId));
              const valuesToInsert = value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);
              const valueData = valuesToInsert.map((v, index) => ({
                templateKeyId: keyId,
                value: v,
                sortOrder: index,
              }));
              if (valueData.length > 0) {
                await tx.insert(templateValueTable).values(valueData);
              }
            }
          } else if (
            (inputType === "text" || inputType === "number") &&
            value
          ) {
            // 文本/数字类型：删除后重建（只有一个值）
            await tx
              .delete(templateValueTable)
              .where(eq(templateValueTable.templateKeyId, keyId));
            const valueData = {
              templateKeyId: keyId,
              value: String(value).trim(),
              sortOrder: 0,
            };
            await tx.insert(templateValueTable).values([valueData]);
          }
        }
      } else {
        // 如果 fields 为空，删除所有字段
        await this.clearTemplateRelations(templateId, tx);
      }

      return templateRes;
    });
  }

  public async delete(id: string, ctx: ServiceContext) {
    return await ctx.db.transaction(async (tx) => {
      // 先清理关联数据
      await this.clearTemplateRelations(id, tx);

      // 再删除模板主体
      const [res] = await tx
        .delete(templateTable)
        .where(eq(templateTable.id, id))
        .returning();

      return res;
    });
  }

  /**
   * 内部清理方法：删除模板关联的所有属性和属性值
   * 抽离出来供 delete 和 update 复用
   */
  private async clearTemplateRelations(templateId: string, tx: Transaction) {
    // 找到该模板下的所有属性 ID
    const oldAttributes = await tx
      .select()
      .from(templateKeyTable)
      .where(eq(templateKeyTable.templateId, templateId));

    const oldAttributeIds = oldAttributes.map((a) => a.id);

    if (oldAttributeIds.length > 0) {
      // a. 删除关联的所有属性值 (ValueTable)
      await tx
        .delete(templateValueTable)
        .where(inArray(templateValueTable.templateKeyId, oldAttributeIds));

      // b. 删除所有属性定义 (templateKeyTable)
      await tx
        .delete(templateKeyTable)
        .where(eq(templateKeyTable.templateId, templateId));
    }
  }

  /**
     * 增量更新模板值：更新已有、删除多余、插入新增
     * 采用“三桶”策略：Delete 桶, Update 桶, Insert 桶
     * 🔥 兜底逻辑：即使前端没传 ID，但 value 字符串完全一致，也会自动匹配到现有的 UUID
     */
  private async upsertTemplateValues(
    keyId: string,
    field: any,
    tx: Transaction
  ) {
    const incomingOptions = field.options || []; // 格式: [{id: 'uuid', value: '红色'}]

    // 1. 获取数据库现有的数据
    const dbValues = await tx
      .select()
      .from(templateValueTable)
      .where(eq(templateValueTable.templateKeyId, keyId));

    // 建立映射表，方便快速查找
    const dbValueMap = new Map(dbValues.map(v => [v.id, v]));
    const dbContentToIdMap = new Map(dbValues.map(v => [v.value, v.id]));

    // 2. 准备三个操作集合
    const toDeleteIds: string[] = [];
    const toUpdate: { id: string, value: string, sortOrder: number }[] = [];
    const toInsert: any[] = [];

    // 计算哪些 ID 应该被删除（数据库有，但提交的 options 里没出现的 ID）
    const submittedIds = new Set(incomingOptions.map((o: any) => o.id).filter(Boolean));
    dbValues.forEach(v => {
      if (!submittedIds.has(v.id)) {
        toDeleteIds.push(v.id);
      }
    });

    // 3. 处理前端提交的数据
    for (const [index, opt] of incomingOptions.entries()) {
      if (opt.id && dbValueMap.has(opt.id)) {
        // 情况 A: 正常的更新（带 ID 且数据库存在）
        toUpdate.push({ id: opt.id, value: opt.value, sortOrder: index });
      } else {
        // 情况 B: 兜底逻辑 —— 没有 ID，但 value 字符串完全一致
        const matchedId = dbContentToIdMap.get(opt.value);

        if (matchedId && toDeleteIds.includes(matchedId)) {
          // 命中兜底：这个值原本在删除名单里，现在复用它，从删除名单移除
          const idx = toDeleteIds.indexOf(matchedId);
          toDeleteIds.splice(idx, 1);
          toUpdate.push({ id: matchedId, value: opt.value, sortOrder: index });
        } else {
          // 情况 C: 真正的全新数据
          toInsert.push({
            templateKeyId: keyId,
            value: opt.value,
            sortOrder: index,
          });
        }
      }
    }

    // --- 4. 统一执行数据库操作 ---

    // A. 执行删除（注意：必须先删关联表，再删主表）
    if (toDeleteIds.length > 0) {
      // 级联清理：删除这些规格值关联的图片/媒体记录
      await tx
        .delete(productVariantMediaTable)
        .where(inArray(productVariantMediaTable.attributeValueId, toDeleteIds));

      await tx
        .delete(templateValueTable)
        .where(inArray(templateValueTable.id, toDeleteIds));
    }

    // B. 执行批量插入
    if (toInsert.length > 0) {
      await tx.insert(templateValueTable).values(toInsert);
    }

    // C. 执行更新（循环更新，因为每个 ID 对应的 value 不同）
    for (const item of toUpdate) {
      await tx
        .update(templateValueTable)
        .set({
          value: item.value,
          sortOrder: item.sortOrder,
        })
        .where(eq(templateValueTable.id, item.id));
    }
  }
}