import { HttpError } from "@pori15/elysia-unified-error";
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
          masterCategoryId,
          name,
        })
        .returning();

      if (!templateRes) {
        throw new HttpError.BadRequest("创建属性模板失败");
      }

      const templateId = templateRes.id;

      // 2. 处理字段列表
      if (fields && fields.length > 0) {
        for (const field of fields) {
          const { inputType, isRequired, options, value, key, isSkuSpec } =
            field;

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
    const rows = await ctx.db
      .select()
      .from(templateTable)
      .leftJoin(
        templateKeyTable,
        eq(templateTable.id, templateKeyTable.templateId)
      )
      .where(search ? like(templateTable.name, `%${search}%`) : undefined);

    const templateMap = new Map();

    for (const row of rows) {
      const t = row.template;
      const key = row.template_key;

      if (!templateMap.has(t.id)) {
        templateMap.set(t.id, {
          id: t.id,
          name: t.name,
          masterCategoryId: t.masterCategoryId,
          fields: [],
        });
      }

      if (key) {
        templateMap.get(t.id).fields.push({
          id: key.id,
          key: key.key, // 前端使用 key
          inputType: key.inputType, // 前端使用 inputType
          isRequired: key.isRequired, // 前端使用 isRequired
          isSkuSpec: key.isSkuSpec,
          // 这里我们统一定义一个 value 字段
          value: "",
          options: [],
        });
      }
    }

    const allFieldIds = Array.from(templateMap.values()).flatMap((t) =>
      t.fields.map((f: any) => f.id)
    );

    if (allFieldIds.length > 0) {
      const allValues = await ctx.db
        .select()
        .from(templateValueTable)
        .where(inArray(templateValueTable.templateKeyId, allFieldIds))
        .orderBy(asc(templateValueTable.sortOrder));

      // 🔥 修复：存储对象数组，包含 id 和 value，确保 UUID 正确流转
      const valuesByAttributeId = new Map<
        string,
        { id: string; value: string }[]
      >();
      for (const val of allValues) {
        if (!valuesByAttributeId.has(val.templateKeyId)) {
          valuesByAttributeId.set(val.templateKeyId, []);
        }
        valuesByAttributeId.get(val.templateKeyId)!.push({
          id: val.id, // 真正的数据库 UUID
          value: val.value,
        });
      }

      for (const template of templateMap.values()) {
        for (const field of template.fields) {
          const rawOptions = valuesByAttributeId.get(field.id) || [];

          // --- 核心逻辑：根据类型决定 value 的格式 ---
          if (
            field.inputType === "select" ||
            field.inputType === "multiselect"
          ) {
            // 对于选择框，value 用于前端预览（逗号分隔）
            field.value = rawOptions.map((o) => o.value).join(", ");
            // 🔥 返回完整的对象数组，包含 UUID
            field.options = rawOptions;
          } else {
            // 对于 text 或 number，value 就是那唯一的一个提示/默认值字符串
            field.value = rawOptions[0]?.value || "";
            field.options = [];
          }
        }
      }
    }

    return Array.from(templateMap.values());
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
   * 这是实现工业级属性管理的核心方法
   *
   * 🔥 兜底逻辑：即使前端没传 ID，但 value 字符串完全一致，也会自动匹配到现有的 UUID
   */
  private async upsertTemplateValues(
    keyId: string,
    field: any,
    tx: Transaction
  ) {
    const incomingOptions = field.options || []; // 格式: [{id: '...', value: 'Red'}]

    // 1. 获取数据库现有的 values
    const dbValues = await tx
      .select()
      .from(templateValueTable)
      .where(eq(templateValueTable.templateKeyId, keyId));
    const dbValueIds = dbValues.map((v) => v.id);

    // 🔥 创建 value -> id 的映射，用于兜底匹配
    const dbValueMap = new Map<string, string>();
    for (const v of dbValues) {
      dbValueMap.set(v.value, v.id);
    }

    // 2. 找出需要删除的 (数据库有，但前端提交的对象里没带这个 ID)
    const submittedIds = incomingOptions.map((o: any) => o.id).filter(Boolean);
    const idsToDelete = dbValueIds.filter((id) => !submittedIds.includes(id));

    if (idsToDelete.length > 0) {
      // 只有被显式删除的 ID，才会触发图片清理
      await tx
        .delete(productVariantMediaTable)
        .where(inArray(productVariantMediaTable.attributeValueId, idsToDelete));
      await tx
        .delete(templateValueTable)
        .where(inArray(templateValueTable.id, idsToDelete));
    }

    // 3. 循环处理提交的选项
    for (const [index, opt] of incomingOptions.entries()) {
      if (opt.id) {
        // 如果有 ID，执行更新文本内容 (ID 不变，图片自动保留)
        await tx
          .update(templateValueTable)
          .set({
            value: opt.value,
            sortOrder: index,
          })
          .where(eq(templateValueTable.id, opt.id));
      } else {
        // 🔥 兜底逻辑：没有 ID 时，尝试通过 value 匹配现有记录
        const existingId = dbValueMap.get(opt.value);
        if (existingId) {
          // 找到匹配的记录，更新它（保持 UUID 不变）
          await tx
            .update(templateValueTable)
            .set({
              value: opt.value,
              sortOrder: index,
            })
            .where(eq(templateValueTable.id, existingId));
          // 从待删除列表中移除（因为已经被使用了）
          const idx = idsToDelete.indexOf(existingId);
          if (idx > -1) {
            idsToDelete.splice(idx, 1);
          }
        } else {
          // 真的是新选项，插入新记录
          await tx.insert(templateValueTable).values({
            templateKeyId: keyId,
            value: opt.value,
            sortOrder: index,
          });
        }
      }
    }
  }
}
