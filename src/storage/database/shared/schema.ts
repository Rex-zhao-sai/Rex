import { pgTable, serial, timestamp, varchar, text, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const equipment = pgTable(
  "equipment",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("equipment_name_idx").on(table.name)]
);

export const maintenanceRecords = pgTable(
  "maintenance_records",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    equipment_id: varchar("equipment_id", { length: 64 }).notNull().references(() => equipment.id),
    month: varchar("month", { length: 7 }).notNull(), // e.g. "2025-07"
    technician: varchar("technician", { length: 64 }),
    notes: text("notes"),
    photo_pairs: jsonb("photo_pairs").notNull().default(sql`'[]'::jsonb`),
    role: varchar("role", { length: 16 }).notNull().default("operator"), // "admin" or "operator"
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("maintenance_records_equipment_id_idx").on(table.equipment_id),
    index("maintenance_records_month_idx").on(table.month),
    index("maintenance_records_equipment_month_idx").on(table.equipment_id, table.month),
    index("maintenance_records_created_at_idx").on(table.created_at),
  ]
);
