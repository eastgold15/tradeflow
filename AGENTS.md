# Agents Guide

This file provides essential guidelines for agentic coding assistants working in this repository.

## Build & Test Commands

### Root Level Commands
```bash
# Development
bun run dev              # Start all apps in dev mode (Turbo)
bun run build            # Build all apps
bun run start            # Start all apps in production mode

# Code Quality
bun run check            # Run linter check (Ultracite)
bun run fix              # Auto-fix lint issues (Ultracite)
bun run check-type       # Type checking across all packages
bun run clean            # Clean build artifacts

# Database
bun run docker:compose   # Start PostgreSQL via Docker
```

### API Service (apps/api)
```bash
bun run dev              # Start API server with watch mode
bun run build            # Build for production
bun run build:exe        # Build standalone executable
bun run start            # Run production build
bun run check            # Lint API code
bun run fix              # Auto-fix API code
bun run type-check       # Type check API only
```

### Web App (apps/web) & B2B Admin (apps/b2badmin)
```bash
bun run dev              # Start Next.js dev server
bun run build            # Build for production
bun run start            # Start production server
bun run type-check       # Type check frontend code
bun run check            # Lint frontend code
bun run fix              # Auto-fix frontend code
```

### Contract Package (packages/contract)
```bash
bun run build            # Build package
bun run db:generate      # Generate Drizzle migrations
bun run db:migrate       # Run database migrations
bun run db:push          # Push schema changes to database
bun run db:studio        # Open Drizzle Studio
bun run seed             # Seed database
bun run type-check       # Type check contract types
```

### Testing
```bash
# Run all tests
bun test

# Run single test file
bun test apps/web/server/modules/inquiry/services/__tests__/excel.service.test.ts

# Run tests in watch mode
bun test --watch
```

## Code Style Guidelines

### Formatting & Linting
- **Formatter**: Ultracite (Biome-based)
- **Command**: `bun run fix` or `npx ultracite fix`
- **Check**: `bun run check` or `npx ultracite check`
- Always run `bun run fix` before committing
- Ultracite handles most formatting automatically

### Import Style
```typescript
// External packages first
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";

// Internal packages with @ alias
import { Something } from "@repo/contract";
import { dbPlugin } from "~/db/connection";
import { logger } from "~/middleware/logger";

// Relative imports for local files
import { ProductService } from "../services/product.service";
```

### Naming Conventions
- **Files**: kebab-case (e.g., `product.service.ts`, `user.controller.ts`)
- **Classes**: PascalCase (e.g., `ProductService`, `BaseController`)
- **Functions/Methods**: camelCase (e.g., `getProductList`, `updateUser`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `API_BASE_URL`)
- **Interfaces/Types**: PascalCase with descriptive names (e.g., `ServiceContext`, `ProductListResponse`)
- **API Routes**: kebab-case (e.g., `/product/page-list`, `/batch/delete`)

### Type Safety
```typescript
// Always type function parameters and return values
async function getProductList(
  query: ProductListQuery,
  ctx: ServiceContext
): Promise<ApiResponse<PageData<Product>>> {
  // implementation
}

// Use type assertions sparingly - prefer type guards
if (typeof value === "string") {
  // TypeScript knows value is string here
}

// Use unknown instead of any when type is genuinely unknown
function processData(data: unknown) {
  // Validate and narrow the type
}
```

### Error Handling
```typescript
// Use HttpError from elysia-http-problem-json for HTTP errors
import { HttpError } from "@pori15/logixlysia";

// Throw appropriate errors
throw new HttpError.NotFound("Product not found");
throw new HttpError.Forbidden("Insufficient permissions");
throw new HttpError.BadRequest("Invalid request data");

// If global error handler exists (check middleware), don't use try-catch in controllers
// Only use try-catch for specific error transformation or logging
```

### API Controller Pattern (Elysia)
```typescript
export const productController = new Elysia({
  prefix: "/product",
  tags: ["Product"],
})
  .use(dbPlugin)
  .use(authGuardMid)
  .get(
    "/page-list",
    ({ query, user, db }) => productService.pagelist(query, { db, user }),
    {
      allPermissions: ["PRODUCT_VIEW"],
      query: ProductContract.ListQuery,
      detail: {
        summary: "Get product list",
        description: "Paginated product listing with filters",
      },
    }
  )
  .post(
    "/",
    ({ body, user, db }) => productService.create(body, { db, user }),
    {
      allPermissions: ["PRODUCT_CREATE"],
      body: ProductContract.Create,
      detail: { summary: "Create product" },
    }
  );
```

### Service Layer Pattern
```typescript
export class ProductService {
  async pagelist(query: ListQuery, ctx: ServiceContext) {
    // Build query
    const conditions = [eq(productTable.tenantId, ctx.user.tenantId)];
    
    // Execute query
    const data = await ctx.db
      .select()
      .from(productTable)
      .where(and(...conditions))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);
    
    return { data, total: data.length, ...query };
  }

  async create(body: CreateDTO, ctx: ServiceContext) {
    return await ctx.db.transaction(async (tx) => {
      // Transaction logic
      const [product] = await tx.insert(productTable).values(body).returning();
      return product;
    });
  }
}
```

### Frontend React/Next.js Pattern
```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { rpc } from "@/lib/rpc";

export function useProductList(params: ListParams = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const { data, error } = await rpc.products.get({ query: params });
      if (error) {
        toast.error(error.value?.message || "Failed to fetch products");
      }
      return data!;
    },
    enabled: !!params.categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Database Schema (Drizzle)
```typescript
// Use db/ for schema definitions
// Tables: <entity>Table (e.g., productTable, userTable)
// Foreign keys use onDelete: "cascade" where appropriate
// Always add tenantId, siteId, deptId for multi-tenancy

export const productTable = pgTable("product", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantTable.id),
  siteId: uuid("site_id").references(() => siteTable.id),
  deptId: uuid("dept_id").references(() => departmentTable.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});
```

### Module Structure (Elysia API)
```
apps/api/src/
├── controllers/        # Route handlers
│   └── product.controller.ts
├── services/          # Business logic
│   └── product.service.ts
├── middleware/        # Middleware
│   └── auth.ts
├── db/                # Database
│   ├── connection.ts
│   └── schema.ts
└── lib/               # Utilities
    └── type.ts
```

### Frontend Structure (Next.js)
```
apps/web/src/
├── app/               # App router pages
├── components/        # React components
│   └── ui/           # shadcn/ui components
├── hooks/            # Custom hooks
│   └── api/          # API hooks (useQuery wrappers)
├── lib/              # Utilities
│   └── rpc.ts        # Elysia client
└── types/            # TypeScript definitions
```

## Testing Guidelines
- Use `bun:test` framework
- Test files: `__tests__/*.test.ts` or `*.test.ts`
- Write tests alongside code (co-location)
- Use `describe`, `it`, `expect` from "bun:test"
- Test business logic, not framework internals
- Mock external dependencies (DB, API calls)

## Environment & Config
- Use `.env` for environment variables
- API config in `apps/api/src/lib/env.ts`
- Frontend config in `apps/web/src/env.ts`
- Never commit `.env` files
- Use catalog: in package.json for shared dependencies

## Key Technologies
- **Runtime**: Bun
- **Backend**: Elysia
- **Frontend**: Next.js 16, React 19
- **Database**: PostgreSQL with Drizzle ORM
- **State**: TanStack Query
- **Auth**: better-auth
- **UI**: shadcn/ui, Radix UI
- **Styling**: Tailwind CSS v4
- **Linting**: Ultracite (Biome)

## Project-Specific Rules

### Elysia Specifics
- Never use namespaces - use object composition
- Add path prefix before dynamic routes to prevent route conflicts
- Example: `/product/:id` instead of `/:product-id`
- Use typebox for validation schemas

### Database Rules
- Always use Docker Compose for local Postgres
- Use transactions for multi-step operations
- Batch queries where possible (reduce N+1 queries)
- Add tenant/site/department filters automatically via base service

### Frontend Rules
- Check router files to understand page relationships
- Use server components for data fetching when possible
- Client components marked with `"use client"`
- Use React 19 ref prop instead of `React.forwardRef`

### Before Committing
1. Run `bun run fix` to format and lint
2. Run `bun run check-type` to type check
3. Test your changes manually
4. Ensure all tests pass: `bun test`

### Delete Operations
- Always accept an array of IDs for batch deletion
- Delete should cascade to related records
- Use single delete endpoint that wraps batch delete logic
- Never expose bulk delete without proper authorization checks

### General Principles
- No console.log, debugger, or alert in production code
- Use semantic HTML and proper ARIA attributes
- Add `rel="noopener"` to external links
- Use `===` and `!==` for comparisons (never == or !=)
- Prefer early returns over nested conditionals
- Write self-documenting code over excessive comments
- Follow SOLID principles
- Keep functions focused and under reasonable complexity limits
