// import { TranslationDictTModel } from "@repo/contract";
// import { and, eq, ilike, or, sql } from "drizzle-orm";
// import { Elysia, t } from "elysia";
// import { HttpError } from "@pori15/logixlysia";
// import { dbPlugin } from "@/server/db/connection";
// import { translationDictTable } from "@/server/db/schema";
// import { type CommonRes, commonRes, type PageData } from "@/server/utils/Res";
// /**
//  * 翻译管理路由
//  *
//  * 提供翻译字典的CRUD管理功能
//  * 支持分页查询、分类筛选、批量操作等
//  */
// export const translateRoute = new Elysia({ name: "translate" })
//   .use(dbPlugin)
//   /**
//    * 获取翻译字典列表（分页）
//    */
//   .get(
//     "/translate",
//     async ({
//       db,
//       query,
//     }): Promise<CommonRes<PageData<TranslationDictTModel["Entity"]>>> => {
//       const { page = 1, limit = 20, key, category, isActive } = query;

//       // 构建查询条件
//       const conditions = [];

//       if (key) {
//         conditions.push(ilike(translationDictTable.key, `%${key}%`));
//       }

//       if (category) {
//         conditions.push(eq(translationDictTable.category, category));
//       }

//       if (typeof isActive === "boolean") {
//         conditions.push(eq(translationDictTable.isActive, isActive));
//       }

//       // 构建WHERE子句
//       const whereClause =
//         conditions.length > 0 ? and(...conditions) : undefined;

//       // 获取总数
//       const count = await db.$count(translationDictTable, whereClause);
//       // .select({ count: sql<number>`count(*)::int` })
//       // .from(translationDictTable)
//       // .where();

//       // 获取分页数据
//       const offset = (page - 1) * limit;
//       const items = await db
//         .select()
//         .from(translationDictTable)
//         .where(whereClause)
//         .orderBy(translationDictTable.sortOrder)
//         .limit(limit)
//         .offset(offset);

//       // 转换 items 中的 translations 字段从字符串到对象
//       const transformedItems = items.map((item) => ({
//         ...item,
//         translations:
//           typeof item.translations === "string"
//             ? JSON.parse(item.translations)
//             : item.translations,
//       }));

//       return commonRes({
//         items: transformedItems,
//         meta: {
//           page,
//           limit,
//           total: count,
//           totalPages: Math.ceil(count / limit),
//         },
//       });
//     },
//     {
//       query: TranslationDictTModel.ListQuery,
//     }
//   )

//   /**
//    * 获取单个翻译详情
//    */
//   .get(
//     "/translate/:id",
//     async ({ db, params }) => {
//       try {
//         const { id } = params;

//         const translation = await db
//           .select()
//           .from(translationDictTable)
//           .where(eq(translationDictTable.id, id))
//           .limit(1);

//         if (!translation[0]) {
//           throw new HttpError.NotFound("翻译不存在");
//         }

//         // 转换 translations 字段从字符串到对象
//         const transformedTranslation = {
//           ...translation[0],
//           translations:
//             typeof translation[0].translations === "string"
//               ? JSON.parse(translation[0].translations)
//               : translation[0].translations,
//         };

//         return {
//           code: 200,
//           message: "获取成功",
//           data: transformedTranslation,
//         };
//       } catch (error) {
//         console.error("获取翻译详情失败:", error);
//         return {
//           code: 500,
//           message: "获取翻译详情失败",
//           data: null,
//         };
//       }
//     },
//     {
//       params: t.Object({
//         id: t.String(),
//       }),
//     }
//   )

//   /**
//    * 创建翻译项
//    */
//   .post(
//     "/translate",
//     async ({ db, body }) => {
//       const result = await db
//         .insert(translationDictTable)
//         .values(body)
//         .returning();

//       return {
//         code: 201,
//         message: "创建成功",
//         data: result[0],
//       };
//     },
//     {
//       body: TranslationDictTModel.Create,
//     }
//   )

//   /**
//    * 更新翻译项
//    */
//   .put(
//     "/translate/:id",
//     async ({ db, params, body }) => {
//       const { id } = params;

//       const result = await db
//         .update(translationDictTable)
//         .set(body)
//         .where(eq(translationDictTable.id, id))
//         .returning();

//       if (result.length === 0) {
//         return {
//           code: 404,
//           message: "翻译项不存在",
//           data: null,
//         };
//       }

//       return {
//         code: 200,
//         message: "更新成功",
//         data: result[0],
//       };
//     },
//     {
//       params: t.Object({
//         id: t.String(),
//       }),
//       body: TranslationDictTModel.Update,
//     }
//   )

//   /**
//    * 删除翻译项（单个）
//    */
//   .delete(
//     "/translate/:id",
//     async ({ db, params }) => {
//       try {
//         const { id } = params;

//         const result = await db
//           .delete(translationDictTable)
//           .where(eq(translationDictTable.id, id))
//           .returning();

//         if (result.length === 0) {
//           return {
//             code: 404,
//             message: "翻译项不存在",
//             data: null,
//           };
//         }

//         return {
//           code: 204,
//           message: "删除成功",
//           data: null,
//         };
//       } catch (error) {
//         console.error("删除翻译失败:", error);
//         return {
//           code: 500,
//           message: "删除翻译失败",
//           data: null,
//         };
//       }
//     },
//     {
//       params: t.Object({
//         id: t.String(),
//       }),
//     }
//   )

//   /**
//    * 批量删除翻译项
//    */
//   .delete(
//     "/translate",
//     async ({ db, body }) => {
//       try {
//         const { ids } = body;

//         if (!Array.isArray(ids) || ids.length === 0) {
//           return {
//             code: 400,
//             message: "请提供有效的ID列表",
//             data: null,
//           };
//         }

//         const result = await db
//           .delete(translationDictTable)
//           .where(or(...ids.map((id) => eq(translationDictTable.id, id))))
//           .returning();

//         return {
//           code: 204,
//           message: `成功删除 ${result.length} 个翻译项`,
//           data: null,
//         };
//       } catch (error) {
//         console.error("批量删除翻译失败:", error);
//         return {
//           code: 500,
//           message: "批量删除翻译失败",
//           data: null,
//         };
//       }
//     },
//     {
//       body: t.Object({
//         ids: t.Array(t.String()),
//       }),
//     }
//   )

//   /**
//    * 获取翻译分类列表
//    */
//   .get("/translate/categories", async ({ db }) => {
//     const categories = await db
//       .selectDistinct({
//         category: translationDictTable.category,
//         count: sql<number>`count(*)::int`,
//       })
//       .from(translationDictTable)
//       .where(sql`${translationDictTable.category} IS NOT NULL`)
//       .groupBy(translationDictTable.category)
//       .orderBy(translationDictTable.category);

//     // 类型守卫：过滤并告诉 TS category 不是 null
//     const rawCategories = categories.filter(
//       (item): item is { category: string; count: number } =>
//         item.category !== null
//     );

//     return commonRes(rawCategories);
//   })

//   /**
//    * 获取翻译文本（用于前端使用）
//    */
//   .get(
//     "/translate/text/:key",
//     async ({ db, params, query }) => {
//       try {
//         const { key } = params;
//         const { locale = "zh-CN", fallback = "en-US" } = query;

//         const translation = await db
//           .select()
//           .from(translationDictTable)
//           .where(eq(translationDictTable.key, key))
//           .limit(1);

//         if (translation.length === 0 || !translation[0]) {
//           throw new HttpError.NotFound(`翻译项${key}」不存在`);
//         }

//         const translations = translation[0].translations;
//         const result = translations[locale] || translations[fallback] || key;

//         return {
//           code: 200,
//           message: "获取成功",
//           data: result,
//         };
//       } catch (error) {
//         console.error("获取翻译文本失败:", error);
//         return {
//           code: 500,
//           message: "获取翻译文本失败",
//           data: null,
//         };
//       }
//     },
//     {
//       params: t.Object({
//         key: t.String(),
//       }),
//       query: t.Object({
//         locale: t.Optional(t.String()),
//         fallback: t.Optional(t.String()),
//       }),
//     }
//   );
