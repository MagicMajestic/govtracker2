import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Bot settings configuration
export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification settings
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  notificationServerId: text("notification_server_id").notNull(), // Discord server ID for notifications
  notificationChannelId: text("notification_channel_id").notNull(), // Discord channel ID for notifications
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Backup frequency settings
export const backupSettings = pgTable("backup_settings", {
  id: serial("id").primaryKey(),
  frequency: text("frequency").notNull().default('daily'), // 'hourly', '4hours', '12hours', 'daily', 'weekly', 'monthly'
  isActive: boolean("is_active").default(true),
  lastBackup: timestamp("last_backup"),
  nextBackup: timestamp("next_backup"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Performance rating thresholds - only min scores and colors
export const ratingSettings = pgTable("rating_settings", {
  id: serial("id").primaryKey(),
  ratingName: text("rating_name").notNull(), // "excellent", "good", "normal", "poor", "terrible"
  ratingText: text("rating_text").notNull(), // "Великолепно", "Хорошо", etc.
  minScore: integer("min_score").notNull(),
  color: text("color").notNull(), // CSS color class
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Global rating configuration - applies to all categories
export const globalRatingConfig = pgTable("global_rating_config", {
  id: serial("id").primaryKey(),
  activityPointsMessage: integer("activity_points_message").notNull().default(3),
  activityPointsReaction: integer("activity_points_reaction").notNull().default(1),
  activityPointsReply: integer("activity_points_reply").notNull().default(2),
  activityPointsTaskVerification: integer("activity_points_task_verification").notNull().default(5),
  responseTimeGoodSeconds: integer("response_time_good_seconds").notNull().default(60),
  responseTimePoorSeconds: integer("response_time_poor_seconds").notNull().default(300),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discord servers configuration
export const discordServers = pgTable("discord_servers", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().unique(),
  name: text("name").notNull(),
  roleTagId: text("role_tag_id"), // ID роли для тегирования кураторов
  completedTasksChannelId: text("completed_tasks_channel_id"), // ID канала completed-tasks
  isActive: boolean("is_active").default(true),
});

// Curators table - updated with subdivision support
export const curators = pgTable("curators", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  name: text("name").notNull(),
  factions: text("factions").array().notNull(), // Multiple factions
  curatorType: text("curator_type").notNull(), // 'government', 'government_crimea', 'crime'
  subdivision: text("subdivision"), // 'government', 'crimea' для государственных
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Response tracking for average response time
export const responseTracking = pgTable("response_tracking", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  curatorId: integer("curator_id"), // Nullable - set when curator responds
  mentionMessageId: text("mention_message_id").notNull(), // Сообщение с тегом роли
  mentionTimestamp: timestamp("mention_timestamp").notNull(),
  responseMessageId: text("response_message_id"), // Ответ куратора
  responseTimestamp: timestamp("response_timestamp"),
  responseType: text("response_type"), // 'reaction' or 'reply'
  responseTimeSeconds: integer("response_time_seconds"), // Время ответа в секундах
});

// Task tracking for completed-tasks channel monitoring
export const taskReports = pgTable("task_reports", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  authorId: text("author_id").notNull(), // Discord ID автора отчета (лидера фракции)
  authorName: text("author_name").notNull(), // Имя автора
  messageId: text("message_id").notNull().unique(), // ID сообщения с отчетом
  channelId: text("channel_id").notNull(), // ID канала completed-tasks
  content: text("content").notNull(), // Содержимое отчета
  taskCount: integer("task_count").notNull(), // Количество задач в отчете
  submittedAt: timestamp("submitted_at").notNull(), // Время подачи отчета
  curatorId: integer("curator_id"), // ID куратора, который проверил
  curatorDiscordId: text("curator_discord_id"), // Discord ID куратора
  curatorName: text("curator_name"), // Имя куратора
  checkedAt: timestamp("checked_at"), // Время проверки
  approvedTasks: integer("approved_tasks"), // Количество одобренных задач
  status: text("status").notNull().default('pending'), // 'pending', 'reviewing', 'verified'
  weekStart: timestamp("week_start").notNull(), // Начало недели для группировки
});

// Activity types: message, reaction, reply
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  curatorId: integer("curator_id").notNull(),
  serverId: integer("server_id").notNull(),
  type: text("type").notNull(), // 'message', 'reaction', 'reply'
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name"),
  messageId: text("message_id"),
  content: text("content"),
  reactionEmoji: text("reaction_emoji"),
  targetMessageId: text("target_message_id"), // for reactions and replies
  targetMessageContent: text("target_message_content"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const curatorsRelations = relations(curators, ({ many }) => ({
  activities: many(activities),
  responseTracking: many(responseTracking),
  taskReports: many(taskReports),
}));

export const discordServersRelations = relations(discordServers, ({ many }) => ({
  activities: many(activities),
  responseTracking: many(responseTracking),
  taskReports: many(taskReports),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  curator: one(curators, {
    fields: [activities.curatorId],
    references: [curators.id],
  }),
  server: one(discordServers, {
    fields: [activities.serverId],
    references: [discordServers.id],
  }),
}));

export const responseTrackingRelations = relations(responseTracking, ({ one }) => ({
  curator: one(curators, {
    fields: [responseTracking.curatorId],
    references: [curators.id],
  }),
  server: one(discordServers, {
    fields: [responseTracking.serverId],
    references: [discordServers.id],
  }),
}));

export const taskReportsRelations = relations(taskReports, ({ one }) => ({
  curator: one(curators, {
    fields: [taskReports.curatorId],
    references: [curators.id],
  }),
  server: one(discordServers, {
    fields: [taskReports.serverId],
    references: [discordServers.id],
  }),
}));

// Schemas
export const insertCuratorSchema = createInsertSchema(curators).pick({
  discordId: true,
  name: true,
  factions: true,
  curatorType: true,
  subdivision: true,
}).extend({
  factions: z.array(z.string()),
  curatorType: z.enum(['government', 'government_crimea', 'crime']),
  subdivision: z.enum(['government', 'crimea']).optional(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true,
});

export const insertDiscordServerSchema = createInsertSchema(discordServers).pick({
  serverId: true,
  name: true,
  roleTagId: true,
  completedTasksChannelId: true,
});

export const insertResponseTrackingSchema = createInsertSchema(responseTracking).omit({
  id: true,
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).pick({
  settingKey: true,
  settingValue: true,
  description: true,
});

export const insertRatingSettingsSchema = createInsertSchema(ratingSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertGlobalRatingConfigSchema = createInsertSchema(globalRatingConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertTaskReportSchema = createInsertSchema(taskReports).omit({
  id: true,
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).pick({
  notificationServerId: true,
  notificationChannelId: true,
});

export const insertBackupSettingsSchema = createInsertSchema(backupSettings).pick({
  frequency: true,
  isActive: true,
});

// Types
export type BotSettings = typeof botSettings.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
export type RatingSettings = typeof ratingSettings.$inferSelect;
export type InsertRatingSettings = z.infer<typeof insertRatingSettingsSchema>;
export type GlobalRatingConfig = typeof globalRatingConfig.$inferSelect;
export type InsertGlobalRatingConfig = z.infer<typeof insertGlobalRatingConfigSchema>;
export type Curator = typeof curators.$inferSelect;
export type InsertCurator = z.infer<typeof insertCuratorSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type DiscordServer = typeof discordServers.$inferSelect;
export type InsertDiscordServer = z.infer<typeof insertDiscordServerSchema>;
export type ResponseTracking = typeof responseTracking.$inferSelect;
export type InsertResponseTracking = z.infer<typeof insertResponseTrackingSchema>;
export type TaskReport = typeof taskReports.$inferSelect;
export type InsertTaskReport = z.infer<typeof insertTaskReportSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type BackupSettings = typeof backupSettings.$inferSelect;
export type InsertBackupSettings = z.infer<typeof insertBackupSettingsSchema>;

// Excluded curators table (for import filtering)
export const excludedCurators = pgTable("excluded_curators", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  name: text("name").notNull(),
  reason: text("reason"),
  excludedAt: timestamp("excluded_at").defaultNow(),
});

export const insertExcludedCuratorSchema = createInsertSchema(excludedCurators).pick({
  discordId: true,
  name: true,
  reason: true,
});

export type ExcludedCurator = typeof excludedCurators.$inferSelect;
export type InsertExcludedCurator = z.infer<typeof insertExcludedCuratorSchema>;

// Users table (keeping original structure)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;