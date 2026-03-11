import { pgTable, serial, timestamp, varchar, text, boolean, uuid, index, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// Health check table (system)
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// Users table - 用户表
export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 128 }),
    role: varchar("role", { length: 20 }).notNull().default("user"), // 'admin' or 'user'
    phone: varchar("phone", { length: 20 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ]
);

// Password reset tokens table - 密码重置令牌表
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("password_reset_tokens_token_idx").on(table.token),
    index("password_reset_tokens_user_id_idx").on(table.userId),
  ]
);

// User agents mapping - 用户与Agent的关联表
export const userAgents = pgTable(
  "user_agents",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    agentId: varchar("agent_id", { length: 255 }).notNull(), // Retell AI agent_id
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_agents_user_id_idx").on(table.userId),
    index("user_agents_agent_id_idx").on(table.agentId),
  ]
);

// User phone numbers mapping - 用户与电话号码的关联表
export const userPhoneNumbers = pgTable(
  "user_phone_numbers",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_phone_numbers_user_id_idx").on(table.userId),
    index("user_phone_numbers_phone_number_idx").on(table.phoneNumber),
  ]
);

// Zod schemas for validation
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// User schemas
export const insertUserSchema = createCoercedInsertSchema(users).pick({
  email: true,
  passwordHash: true,
  name: true,
  role: true,
  phone: true,
});

export const updateUserSchema = createCoercedInsertSchema(users)
  .pick({
    name: true,
    phone: true,
    isActive: true,
  })
  .partial();

// Password reset token schemas
export const insertPasswordResetTokenSchema = createCoercedInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

// User agent assignment schema
export const insertUserAgentSchema = createCoercedInsertSchema(userAgents).pick({
  userId: true,
  agentId: true,
});

// User phone number assignment schema
export const insertUserPhoneNumberSchema = createCoercedInsertSchema(userPhoneNumbers).pick({
  userId: true,
  phoneNumber: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type UserAgent = typeof userAgents.$inferSelect;
export type UserPhoneNumber = typeof userPhoneNumbers.$inferSelect;
