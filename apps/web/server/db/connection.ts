import { relations } from "@repo/contract";
import { drizzle } from "drizzle-orm/node-postgres";
import { Elysia } from "elysia";
import { env } from "@/env";

export const db = drizzle(env.DATABASE_URL, { relations });

export const dbPlugin = new Elysia({ name: "db" })
  .decorate("db", db)
  .as("global");
