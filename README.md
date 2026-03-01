# TradeFlow - B2B 制造业询报价管理系统

<div align="center">

**一个现代化的多租户 B2B 制造业数字化解决方案**

[![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black.svg)](https://nextjs.org)
[![ElysiaJS](https://img.shields.io/badge/Elysia-1.0+-blue.svg)](https://elysiajs.com)

</div>

## 项目简介

TradeFlow 是专为**出口贸易商和制造业工厂**设计的 B2B 询报价管理系统。系统采用多租户架构，支持一个出口商管理旗下多个工厂，实现从产品展示、客户询价、智能分配业务员、报价生成到订单跟踪的全流程数字化管理。

### 核心特性

- 多租户隔离架构（Tenant → Department → User）
- 集团站与工厂站双模式运营
- 智能询盘自动分配系统（按品类、部门、业务员负载）
- 基于角色的数据权限控制（全部/本部门及下级/本部门）
- 产品资产复用（一套产品可在多个站点展示）
- Schema 驱动开发（数据库契约自动生成 API 类型）

## 技术栈

### 后端
- **框架**: [ElysiaJS](https://elysiajs.com) - 基于 Bun 的高性能 Web 框架
- **数据库**: PostgreSQL + [Drizzle ORM 1.0](https://orm.drizzle.team)
- **认证**: Better Auth（邮箱密码 + GitHub OAuth）
- **验证**: TypeBox + Zod
- **文档**: OpenAPI (Swagger)

### 前端
- **框架**: Next.js 16 (App Router)
- **UI**: Tailwind CSS + Radix UI
- **状态管理**: Zustand
- **数据获取**: TanStack Query
- **类型安全**: 通过 `@repo/contract` 共享后端类型

### 基础设施
- **Monorepo**: Turborepo
- **包管理**: Bun
- **数据库**: Docker Compose (PostgreSQL)
- **文件存储**: 阿里云 OSS
- **代码规范**: Ultracite (基于 Biome)

## 系统架构

```
租户 (Tenant) 出口商/制造商
    ↓
部门 (Department) 总部 / 工厂（树形结构）
    ↓
用户 (User) 业务员 / 管理员
    ↓
站点 (Site) 集团站 / 工厂站
    ↓
产品 (Product → SKU) → 媒体 (Media)
    ↓
询价 (Inquiry) → 报价 (Quotation)
```

## 目录结构

```
├── apps/
│   ├── b2b-api/          # Elysia 后端 API
│   ├── b2badmin/         # 后台管理系统 (Next.js)
│   └── web/              # 客户端前台 (Next.js)
│
├── packages/
│   ├── contract/         # 共享契约层（Schema + 类型）
│   └── tsconfig/         # TypeScript 配置
│
├── docs/                 # 项目文档
│   ├── 实体.md           # 实体关系图
│   ├── status.md         # 项目状态
│   └── dirzzleV1.0查询.md # Drizzle 查询语法
│
└── CLAUDE.md             # Claude Code 开发指南
```

## 快速开始

### 前置要求

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docker.com) (用于 PostgreSQL)
- 阿里云 OSS 账号（用于文件存储）
- 阿里云翻译服务（可选）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd shop
```

2. **安装依赖**
```bash
bun install
```

3. **配置环境变量**

复制并编辑以下环境变量文件：
- `apps/b2b-api/.env.example` → `.env`
- `apps/b2badmin/.env.example` → `.env.local`
- `apps/web/.env.example` → `.env.local`

4. **启动数据库**
```bash
cd apps/b2b-api && docker-compose up -d
```

5. **推送数据库 Schema**
```bash
cd packages/contract
bun db:push
```

6. **启动开发服务器**
```bash
bun dev
```

访问：
- 后台管理: http://localhost:3001
- 客户端前台: http://localhost:3000
- API 文档: http://localhost:8080/openapi

## 开发指南

### Schema 驱动开发

项目采用 Schema 驱动开发模式，所有业务改动从 `packages/contract/src/table.schema.ts` 开始：

1. 修改数据库 Schema
2. 运行 `bun db:push` 同步数据库
3. 契约层自动生成类型定义
4. 实现业务逻辑（Controller → Service）

### 自动代码生成

项目包含自动脚本，可从数据库 Schema 生成基础的 Controller 和 Service：

```bash
cd packages/contract
bun run gen-all-final.ts
```

<details>
<summary>查看自动生成演示</summary>

<!-- 完整配置：指定高度、封面图、禁用循环 -->
<video width="800" height="450" controls >
  <source src="./docs/video/自动生成.mp4" type="video/mp4">
  你的浏览器不支持 HTML5 视频播放。
</video>

</details>

### 契约层规范

- **禁止**手动编写 API interface
- **必须**通过 `import { XxxContract } from "@/modules"` 访问契约
- **必须**使用 `*Contract` 类型，而非 `*TModel` 类型
- 扩展类型请在 `packages/contract/src/modules/_custom/` 下创建

### 命名规范

- 数据库表: 单数 + 小写 + 下划线 (如 `sys_user`, `product`)
- 模块文件夹: kebab-case (如 `user-role`, `inquiry`)
- 文件命名: 模块名 + 后缀 (如 `inquiry.contract.ts`, `inquiry.service.ts`)

更多规范请参阅：
- [变量命名规范](./docs/NAMING_CONVENTION.md)
- [API 路径映射规范](./docs/API_PATH_MAPPING.md)

## 系统功能

### 组织架构
- 多租户（出口商/制造商）隔离
- 树形部门结构（总部 → 工厂 → 车间）
- 基于角色的功能权限和数据权限

### 产品管理
- 主分类体系（多级分类）
- 产品（SPU）与 SKU 管理
- 产品模板系统（动态属性定义）
- 媒体文件管理（图片/视频/文档）

### 站点运营
- 集团站（展示所有产品）
- 工厂站（展示特定产品）
- 独立的 SEO 配置
- 广告与轮播图管理

### 询价报价
- 客户在线询价
- 智能分配业务员（按品类、部门、负载）
- 报价单生成
- 询盘统计与追踪

## 文档

- [实体关系图](./docs/实体.md) - 数据库表关系说明
- [项目状态](./docs/status.md) - 当前开发进度
- [Drizzle 查询语法](./docs/dirzzleV1.0查询.md) - 数据库查询示例

## 许可证

本项目采用**双重许可证**模式：

### AGPL-3.0 开源许可

适用于：
- 个人学习和研究
- 开源项目
- 非商业用途

[查看完整的 AGPL-3.0 协议](./LICENSE)

### 商业授权

适用于：
- 商业产品或服务
- 不想公开源码的定制开发
- 需要专有技术支持的企业

**购买商业授权可获得：**
- 闭源使用权限
- 优先技术支持
- 定制开发服务

商业授权联系：[your@email.com](mailto:your@email.com)

---

<div align="center">

Made with ❤️ by [Your Name]

</div>
