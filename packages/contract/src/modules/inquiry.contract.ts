import { t } from "elysia";
import { PaginationParams, SortParams } from "../helper/query-types.model";
import { type InferDTO, spread } from "../helper/utils";
import { inquiryTable } from "../table.schema";

/** [Auto-Generated] Do not edit this tag to keep updates. @generated */
export const InquiryInsertFields = spread(inquiryTable, "insert");
/** [Auto-Generated] Do not edit this tag to keep updates. @generated */
export const InquiryFields = spread(inquiryTable, "select");
export const InquiryContract = {
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  Response: t.Object({
    ...InquiryFields,
  }),

  Create: t.Composite([
    t.Object({
      customerName: t.Optional(t.String()),
      customerCompany: t.String(),
      customerEmail: t.String(),
      customerPhone: t.Optional(t.String()),
      customerWhatsapp: t.Optional(t.String()),

      siteProductId: t.String(),
      siteSkuId: t.String(),
      skuMediaId: t.String(),

      quantity: t.Number(),
      productName: t.String(),
      productDescription: t.String(),
      paymentMethod: t.String(),
      customerRequirements: t.Optional(t.String()),
    }),
  ]),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  Update: t.Partial(
    t.Object({
      ...t.Omit(t.Object(InquiryInsertFields), [
        "id",
        "createdAt",
        "updatedAt",
        "siteId",
      ]).properties,
    })
  ),
  // Patch 请求 (部分更新)
  Patch: t.Partial(
    t.Object({
      ...t.Omit(t.Object(InquiryInsertFields), [
        "id",
        "createdAt",
        "updatedAt",
        "siteId",
      ]).properties,
    })
  ),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  ListQuery: t.Object({
    ...t.Partial(t.Object(InquiryInsertFields)).properties,
    ...PaginationParams.properties,
    ...SortParams.properties,
    search: t.Optional(t.String()),
  }),
  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  ListResponse: t.Object({
    data: t.Array(t.Object({ ...InquiryFields })),
    total: t.Number(),
  }),
} as const;

export type InquiryContract = InferDTO<typeof InquiryContract>;
