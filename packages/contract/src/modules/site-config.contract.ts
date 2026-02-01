import { t } from "elysia";
import { type InferDTO, spread } from "../helper/utils";
import { siteConfigTable } from "../table.schema";

/** [Auto-Generated] Do not edit this tag to keep updates. @generated */
export const SiteConfigInsertFields = spread(siteConfigTable, "insert");
/** [Auto-Generated] Do not edit this tag to keep updates. @generated */
export const SiteConfigFields = spread(siteConfigTable, "select");
export const SiteConfigContract = {
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  Response: t.Object({
    ...SiteConfigFields,
  }),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  Create: t.Object({
    ...t.Omit(t.Object(SiteConfigInsertFields), [
      "id",
      "createdAt",
      "updatedAt",
    ]).properties,
  }),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  Update: t.Partial(
    t.Object({
      ...t.Omit(t.Object(SiteConfigInsertFields), [
        "id",
        "createdAt",
        "updatedAt",
        "siteId",
      ]).properties,
    })
  ),

  ListQuery: t.Object({
    key: t.Optional(t.String()),
    keys: t.Optional(t.Array(t.String())),
    search: t.Optional(t.String()),
  }),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  ListResponse: t.Object({
    data: t.Array(t.Object({ ...SiteConfigFields })),
    total: t.Number(),
  }),
  // 配置键相关
  KeysResponse: t.Object({
    keys: t.Array(
      t.Object({
        key: t.String(),
        count: t.Number(),
      })
    ),
  }),
} as const;

export type SiteConfigContract = InferDTO<typeof SiteConfigContract>;
