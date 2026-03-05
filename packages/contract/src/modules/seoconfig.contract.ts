/**
 * ✍️ 【Contract - 业务自定义层】
 * --------------------------------------------------------
 * 💡 你可以直接在此修改 Response, Create, Update 等字段。
 * 🛡️ 脚本检测到文件存在时永远不会覆盖此处。
 * --------------------------------------------------------
 */
import { t } from "elysia";
import { PaginationParams, SortParams } from "../helper/query-types.model";
import { InferDTO, spread } from "../helper/utils";
import { seoConfigTable } from "../table.schema";

export const SeoConfigBase = {
  fields: spread(seoConfigTable, "select"),
  insertFields: spread(seoConfigTable, "insert"),
} as const;

export const SeoConfigContract = {
  Response: t.Object({ ...SeoConfigBase.fields }),
  Create: t.Object(
    t.Omit(t.Object(SeoConfigBase.insertFields), [
      "id",
      "createdAt",
      "updatedAt",
    ]).properties
  ),
  Update: t.Partial(
    t.Omit(t.Object(SeoConfigBase.insertFields), [
      "id",
      "createdAt",
      "updatedAt",
      "siteId",
    ])
  ),
  ListQuery: t.Object({
    ...t.Partial(t.Object(SeoConfigBase.insertFields)).properties,
    ...PaginationParams.properties,
    ...SortParams.properties,

    search: t.Optional(t.String()),
  }),

  ListResponse: t.Object({
    data: t.Array(t.Object(SeoConfigBase.fields)),
    total: t.Number(),
  }),
} as const;

export type SeoConfigContract = InferDTO<typeof SeoConfigContract>;
