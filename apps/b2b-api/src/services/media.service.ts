import { HttpError } from "@pori15/logixlysia";
import { type MediaContract, mediaTable } from "@repo/contract";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { envConfig } from "~/lib/env";
import { BunS3StorageImpl } from "~/lib/media/storage/impl/BunS3StorageImpl";
import { getMediaUrl } from "~/lib/media-url";
import { type ServiceContext } from "../lib/type";

const client = new BunS3StorageImpl({
  accessKeyId: Bun.env.ACCESS_KEY_ID!,
  secretAccessKey: Bun.env.SECRET_ACCESS_KEY!,
  bucket: Bun.env.BUCKET!,
  region: Bun.env.REGION!,
  endpoint: Bun.env.ENDPOINT!,
  domain: envConfig.IMGDOMAIN,
});
export class MediaService {
  /**
   * 处理文件上传逻辑（支持单个或多个文件）
   */
  async upload(body: MediaContract["Uploads"], ctx: ServiceContext) {
    const { files, category = "general" } = body;
    // 支持单个或多个文件上传
    const results = await Promise.all(
      files.map(async (file) => {
        // 1. 检查同名文件（在当前租户范围内）
        const existing = await ctx.db.query.mediaTable.findFirst({
          where: {
            tenantId: ctx.user.context.tenantId!,
            originalName: file.name,
          },
          columns: { id: true },
        });

        if (existing) {
          throw new HttpError.Conflict(`文件名 "${file.name}" 已存在，请修改文件名后重试`);
        }

        // 2. 物理上传
        console.log("File object:", file);
        console.log("File type:", typeof file);
        console.log("File has name property:", "name" in file);
        console.log("File has type property:", "type" in file);
        console.log("File has size property:", "size" in file);
        console.log("File name:", file?.name);
        console.log("File type:", file?.type);
        console.log("File size:", file?.size);
        const uploadResult = await client.upload(file, category);
        console.log("uploadResult:", uploadResult);
        // 3. 直接插入数据库
        const insertData = {
          url: uploadResult.url,
          storageKey: uploadResult.key,
          originalName: file.name,
          mimeType: file.type,
          // 根据文件类型自动判断 mediaType
          mediaType: file.type?.startsWith("video/")
            ? "video"
            : ("image" as MediaContract["MediaType"]),
          category,
          isPublic: true,
          status: true,
          // 自动注入租户信息
          tenantId: ctx.user.context.tenantId,
          siteId: ctx.user.context.site.id,
          deptId: ctx.currentDeptId!,
          createdBy: ctx.user.id,
        };

        const [res] = await ctx.db
          .insert(mediaTable)
          .values(insertData)
          .returning();
        return res;
      })
    );

    return results;
  }

  public async create(body: MediaContract["Create"], ctx: ServiceContext) {
    const insertData = {
      ...body,
      // 自动注入租户信息
      ...(ctx.user
        ? {
          tenantId: ctx.user.context.tenantId!,
          createdBy: ctx.user.id,
          deptId: ctx.currentDeptId,
        }
        : {}),
    };
    const [res] = await ctx.db
      .insert(mediaTable)
      .values(insertData)
      .returning();
    return res;
  }

  public async list(query: MediaContract["ListQuery"], ctx: ServiceContext) {
    const { search, ids, category } = query;
    const res = await ctx.db.query.mediaTable.findMany({
      where: {
        tenantId: ctx.user.context.tenantId!,
        deptId: ctx.currentDeptId,
        ...(ids
          ? {
            id: {
              in: ids,
            },
          }
          : {}),
        ...(category ? { category } : {}),
        ...(search ? { originalName: { ilike: `%${search}%` } } : {}),
      },
      orderBy: {
        originalName: "desc",
        createdAt: "desc",
      }
    });
    return res;
  }

  /**
   * 分页查询媒体列表
   */
  public async pageList(
    query: MediaContract["PageListQuery"],
    ctx: ServiceContext
  ) {
    const { search, page = 1, limit = 10, category } = query;

    // 查询数据（带分页）
    const data = await ctx.db.query.mediaTable.findMany({
      where: {
        tenantId: ctx.user.context.tenantId!,
        deptId: ctx.currentDeptId,
        ...(category ? { category } : {}),
        ...(search ? { originalName: { ilike: `%${search}%` } } : {}),
      },
      limit,
      offset: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
    });

    // 查询总数
    const totalResult = await ctx.db.$count(mediaTable);
    return {
      data,
      total: totalResult,
      page,
      limit,
    };
  }

  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async update(
    id: string,
    body: MediaContract["Update"],
    ctx: ServiceContext
  ) {
    const updateData = { ...body, updatedAt: new Date() };
    const [res] = await ctx.db
      .update(mediaTable)
      .set(updateData)
      .where(eq(mediaTable.id, id))
      .returning();
    return res;
  }

  /** [Auto-Generated] Do not edit this tag to keep updates. @generated */
  public async delete(id: string, ctx: ServiceContext) {
    const [res] = await ctx.db
      .delete(mediaTable)
      .where(eq(mediaTable.id, id))
      .returning();
    return res;
  }

  /**
   * 获取媒体列表（带筛选）
   */
  async mediaList(
    query: { category?: string; search?: string; ids?: string[] },
    ctx: ServiceContext
  ) {
    const filters: any[] = [];

    // 租户隔离
    if (ctx.user?.context.tenantId)
      filters.push(eq(mediaTable.tenantId, ctx.user.context.tenantId!));

    if (query.category) filters.push(eq(mediaTable.category, query.category));
    if (query.search)
      filters.push(like(mediaTable.originalName, `%${query.search}%`));
    if (query.ids && query.ids.length > 0)
      filters.push(inArray(mediaTable.id, query.ids));

    const files = await ctx.db
      .select()
      .from(mediaTable)
      .where(and(...filters))
      .orderBy(sql`${mediaTable.createdAt} desc`);

    return files.map((file: any) => ({
      ...file,
      url: getMediaUrl(file.storageKey),
    }));
  }

  /**
   * 物理删除文件
   */
  async deletePhysical(id: string, ctx: ServiceContext) {
    // 1. 先查出记录
    const whereConditions: any[] = [eq(mediaTable.id, id)];
    if (ctx.user?.context.tenantId)
      whereConditions.push(eq(mediaTable.tenantId, ctx.user.context.tenantId!));

    const [file] = await ctx.db
      .select()
      .from(mediaTable)
      .where(and(...whereConditions))
      .limit(1);

    if (!file) throw new HttpError.NotFound(`Media (ID: ${id})：不存在或无权访问`);

    // 2. 删除物理文件

    await client.delete(file.storageKey);

    // 3. 调用 delete 方法
    return await this.delete(id, ctx);
  }

  /**
   * 批量物理删除
   */
  async batchDelete(ids: string[], ctx: ServiceContext) {
    const whereConditions: any[] = [inArray(mediaTable.id, ids)];
    if (ctx.user?.context.tenantId)
      whereConditions.push(eq(mediaTable.tenantId, ctx.user.context.tenantId!));

    // 1. 查找所有符合条件的文件
    const files = await ctx.db
      .select()
      .from(mediaTable)
      .where(and(...whereConditions));

    if (files.length === 0) throw new HttpError.NotFound(`Media (IDs: ${ids.join(", ")})：未找到可删除的记录`);

    // 2. 物理删除
    await Promise.all(files.map((f: any) => client.delete(f.storageKey)));

    // 3. 数据库批量删除
    await ctx.db.delete(mediaTable).where(and(...whereConditions));

    return { count: files.length };
  }

  /**
   * 获取所有媒体分类及数量
   */
  async getCategories(ctx: ServiceContext) {
    const whereConditions: any[] = [];
    if (ctx.user?.context.tenantId)
      whereConditions.push(eq(mediaTable.tenantId, ctx.user.context.tenantId!));
    if (ctx.currentDeptId)
      whereConditions.push(eq(mediaTable.deptId, ctx.currentDeptId));

    // 使用 SQL 聚合查询获取分类统计
    const categories = await ctx.db
      .select({
        name: mediaTable.category,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(mediaTable)
      .where(and(...whereConditions))
      .groupBy(mediaTable.category)
      .orderBy(sql`count(*) desc`);

    return {
      categories,
    };
  }
}
