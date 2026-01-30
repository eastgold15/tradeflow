# Web 项目错误处理和日志系统

本文档说明了 Web 项目中集成的错误处理和日志系统，该系统与 B2B Admin 项目保持一致。

## 目录结构

```
server/
├── utils/err/
│   ├── err.plugin.ts          # 全局错误处理插件
│   ├── database-error-mapper.ts  # 数据库错误映射
│   └── guards.ts              # 错误类型守卫
├── plugins/
│   └── logger.ts              # 日志系统插件
├── server.ts                  # 主服务器配置（集成所有插件）
└── logs/                      # 日志文件目录
    ├── app.log                # 应用日志
    └── errors.log             # 错误日志
```

## 错误处理系统

### 核心特性

1. **统一错误处理**
   - 自动捕获所有未处理的错误
   - 将数据库错误转换为合适的 HTTP 状态码
   - 提供详细的错误信息（开发环境）

2. **数据库错误映射**
   - 23502 (非空约束) → 400 Bad Request
   - 23503 (外键约束) → 400 Bad Request
   - 23505 (唯一约束) → 409 Conflict
   - 40P01 (死锁) → 500 Internal Server Error
   - 更多错误码映射请参考 `database-error-mapper.ts`

3. **RFC 7807 问题详情格式**
   - 使用 `elysia-http-problem-json` 插件
   - 标准化的错误响应结构
   - 支持扩展字段（如 `x-pg-code`）

### 使用示例

```typescript
// 在控制器中抛出业务错误
import {  HttpError  } from "@pori15/elysia-unified-error";

app.get("/users/:id", async ({ params }) => {
  const user = await getUserById(params.id);

  if (!user) {
    throw new HttpError.NotFound("用户不存在");
  }

  return user;
});
```

### 开发环境特性

- 彩色终端输出
- 详细的错误堆栈信息
- 数据库错误原始信息展示
- 错误来源标识（database/http/unknown）

## 日志系统

### 日志配置

- 日志格式：`🦊 {now} {level} {duration} {method} {pathname} {status} {message} {ip}`
- 日志级别：ERROR、WARNING、INFO
- 时间戳格式：`yyyy-mm-dd HH:MM:ss`
- 包含客户端 IP 地址

### 日志文件

- **app.log**: 所有请求的访问日志
- **errors.log**: 专门的错误日志

### 日志示例

```
🦊 2024-01-20 10:30:45 INFO 15ms GET /api/v1/products 200 OK 203.0.113.1
🦊 2024-01-20 10:30:50 ERROR 120ms POST /api/v1/products 400 Bad Request 203.0.113.1
```

## 插件加载顺序

在 `server.ts` 中，插件按以下顺序加载：

1. **loggerPlugin** - 记录请求信息
2. **errorPlugin** - 错误处理和转换
3. **httpProblemJsonPlugin** - 格式化错误响应
4. **dbPlugin** - 数据库连接
5. **siteMiddleware** - 站点中间件

## 环境变量

确保在 `.env` 文件中配置：

```env
NODE_ENV=development  # 或 production
```

开发环境会显示详细的错误信息，生产环境只记录必要信息。

## 最佳实践

### 1. 控制器层错误处理

```typescript
// 推荐做法：直接抛出 HttpError
if (!product) {
  throw new HttpError.NotFound("产品不存在");
}

// 推荐做法：使用具体的错误类型
throw new HttpError.BadRequest("产品名称不能为空");
throw new HttpError.Conflict("产品编码已存在");
```

### 2. 数据库操作

```typescript
// 数据库错误会被自动捕获和转换
await db.insert(productsTable).values(productData);
// 如果违反唯一约束，会自动转换为 409 Conflict
```

### 3. 错误日志查看

```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/errors.log
```

### 4. 生产环境配置

```env
NODE_ENV=production
# 错误日志会更简洁，不暴露内部细节
```

## 扩展功能

### 添加自定义错误映射

在 `database-error-mapper.ts` 中添加新的错误码映射：

```typescript
case "CUSTOM_ERROR":
  return new HttpError.BadRequest("自定义错误消息", extensions);
```

### 自定义日志格式

在 `plugins/logger.ts` 中修改 `customLogFormat`：

```typescript
customLogFormat: "🎯 {now} [{level}] {method} {pathname} → {status} {message}"
```

## 故障排查

### 1. 日志不显示
- 检查 `logs/` 目录权限
- 确保 `logFilePath` 配置正确

### 2. 错误响应格式问题
- 确保 `httpProblemJsonPlugin` 在 `errorPlugin` 之后加载
- 检查是否正确重新抛出处理后的错误

### 3. 数据库错误映射不工作
- 检查 `isDatabaseError` 类型守卫
- 确认数据库错误包含正确的 `code` 字段

## 相关依赖

- `elysia-http-problem-json`: RFC 7807 错误响应格式
- `logixlysia`: Elysia 日志插件
- `chalk`: 终端颜色输出（开发环境）