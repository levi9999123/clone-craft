import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep the original users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Define photos table
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lat: text("lat"),
  lon: text("lon"),
  userId: integer("user_id").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: text("created_at").notNull()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPhotoSchema = createInsertSchema(photos).pick({
  name: true,
  lat: true,
  lon: true,
  userId: true,
  metadata: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;
