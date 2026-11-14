import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

export type PlatformLinks = {
  spotify?: string;
  soundcloud?: string;
  appleMusic?: string;
  youtube?: string;
  suno?: string;
  udio?: string;
  bandcamp?: string;
};

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  artistName: text("artist_name").notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url"),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  links: text("links", { mode: "json" }).$type<PlatformLinks>().notNull().default({}),
  /** Artist-set donation goal in whole dollars. Null = no goal (running total only). */
  donationGoal: integer("donation_goal"),
  donationPitch: text("donation_pitch").notNull().default(""),
  /** Membership mirrored from Autumn for badges: free | pro | pro_byok. */
  plan: text("plan", { enum: ["free", "pro", "pro_byok"] }).notNull().default("free"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const tracks = sqliteTable("tracks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  genre: text("genre").notNull(),
  origin: text("origin", { enum: ["ai", "original"] }).notNull(),
  aiTool: text("ai_tool"),
  description: text("description").notNull().default(""),
  audioUrl: text("audio_url").notNull(),
  coverUrl: text("cover_url"),
  bpm: integer("bpm"),
  durationSec: integer("duration_sec"),
  plays: integer("plays").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  links: text("links", { mode: "json" }).$type<PlatformLinks>().notNull().default({}),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const trackLikes = sqliteTable(
  "track_likes",
  {
    userId: text("user_id").notNull(),
    trackId: integer("track_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.trackId] })],
);

export const playEvents = sqliteTable("play_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackId: integer("track_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type BeatPattern = {
  bpm: number;
  swing: number;
  steps: number;
  tracks: { id: string; steps: boolean[]; volume: number; muted: boolean; note?: number[] }[];
};

export const beats = sqliteTable("beats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  pattern: text("pattern", { mode: "json" }).$type<BeatPattern>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const aiSongs = sqliteTable("ai_songs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  audioUrl: text("audio_url").notNull(),
  /** "earbass" = platform credits; otherwise the user's own provider key. */
  provider: text("provider").notNull().default("earbass"),
  seconds: integer("seconds").notNull().default(60),
  credits: integer("credits").notNull().default(0),
  status: text("status", { enum: ["pending", "ready", "failed"] }).notNull().default("ready"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const usageRequests = sqliteTable("usage_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackId: integer("track_id").notNull(),
  artistId: text("artist_id").notNull(),
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name").notNull(),
  platform: text("platform").notNull(),
  purpose: text("purpose").notNull(),
  message: text("message").notNull().default(""),
  creditLine: text("credit_line"),
  status: text("status", { enum: ["pending", "approved", "declined"] }).notNull().default("pending"),
  reply: text("reply"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  decidedAt: integer("decided_at", { mode: "timestamp" }),
});

/** Donations. recipientId = artist userId, or "earbass" for the platform fund. */
export const donations = sqliteTable("donations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipientId: text("recipient_id").notNull(),
  trackId: integer("track_id"),
  donorId: text("donor_id").notNull(),
  donorName: text("donor_name").notNull(),
  amount: integer("amount").notNull(),
  message: text("message").notNull().default(""),
  source: text("source", { enum: ["web", "app"] }).notNull().default("web"),
  status: text("status", { enum: ["pending", "paid"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  paidAt: integer("paid_at", { mode: "timestamp" }),
});

export const PROVIDERS = ["elevenlabs", "replicate", "stability", "mubert"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** A user's own AI music API key (encrypted at rest; never sent back to clients). */
export const providerKeys = sqliteTable(
  "provider_keys",
  {
    userId: text("user_id").notNull(),
    provider: text("provider", { enum: PROVIDERS }).notNull(),
    secret: text("secret").notNull(),
    hint: text("hint").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.provider] })],
);

/** One row per user once the 3 free song credits have been granted. */
export const creditAccounts = sqliteTable("credit_accounts", {
  userId: text("user_id").primaryKey(),
  freeGrantedAt: integer("free_granted_at", { mode: "timestamp" }).notNull(),
});

/** Rewarded ad views (sponsored track spot). Claimable after AD_SECONDS. */
export const adViews = sqliteTable("ad_views", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  trackId: integer("track_id"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  claimedAt: integer("claimed_at", { mode: "timestamp_ms" }),
});
