/* eslint-disable */
// GENERADO por `npm run db:pull` a partir de la base. No editar a mano:
// los cambios de esquema van en db/evolution y después se regenera este archivo.
import type { PgTableExtraConfigValue } from "drizzle-orm/pg-core"
import { geographyPoint } from "../custom-types"
import { pgTable, check, uuid, text, timestamp, unique, smallint, boolean, index, foreignKey, type AnyPgColumn, numeric, char, jsonb, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const matchGender = pgEnum("match_gender", ['mixed', 'male', 'female'])
export const matchStatus = pgEnum("match_status", ['draft', 'open', 'confirmed', 'played', 'cancelled'])
export const matchVisibility = pgEnum("match_visibility", ['public', 'private'])
export const participantStatus = pgEnum("participant_status", ['interested', 'confirmed', 'waitlist', 'left'])
export const skillLevel = pgEnum("skill_level", ['beginner', 'intermediate', 'advanced'])
export const teamRole = pgEnum("team_role", ['owner', 'admin', 'member'])
export const venueStatus = pgEnum("venue_status", ['verified', 'pending', 'rejected'])


export const profiles = pgTable("profiles", {
	userId: uuid("user_id").primaryKey().notNull(),
	displayName: text("display_name").notNull(),
	avatarUrl: text("avatar_url"),
	city: text(),
	cityLocation: geographyPoint("city_location"),
	bio: text(),
	onboardedAt: timestamp("onboarded_at", { withTimezone: true, mode: 'date' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'date' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table): PgTableExtraConfigValue[] => [
	check("profiles_display_name_check", sql`(char_length(display_name) >= 1) AND (char_length(display_name) <= 60)`),
	check("profiles_bio_check", sql`char_length(bio) <= 280`),
]);

export const sports = pgTable("sports", {
	id: smallint().primaryKey().generatedAlwaysAsIdentity({ name: "sports_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
	slug: text().notNull(),
	name: text().notNull(),
	defaultCapacity: smallint("default_capacity").notNull(),
	sortOrder: smallint("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table): PgTableExtraConfigValue[] => [
	unique("sports_slug_key").on(table.slug),
	check("sports_slug_check", sql`slug ~ '^[a-z0-9-]+$'::text`),
	check("sports_default_capacity_check", sql`(default_capacity >= 2) AND (default_capacity <= 30)`),
]);

export const venues = pgTable("venues", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	address: text().notNull(),
	city: text().notNull(),
	location: geographyPoint("location").notNull(),
	timezone: text().default('America/Argentina/Buenos_Aires').notNull(),
	googlePlaceId: text("google_place_id"),
	phone: text(),
	photoUrl: text("photo_url"),
	status: venueStatus().default('pending').notNull(),
	createdBy: uuid("created_by"),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'date' }),
	mergedIntoId: uuid("merged_into_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table): PgTableExtraConfigValue[] => [
	index("venues_location_gix").using("gist", table.location.asc().nullsLast().op("gist_geography_ops")),
	index("venues_name_trgm_idx").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	index("venues_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.userId],
			name: "venues_created_by_fkey"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [profiles.userId],
			name: "venues_reviewed_by_fkey"
		}),
	foreignKey({
			columns: [table.mergedIntoId],
			foreignColumns: [table.id],
			name: "venues_merged_into_id_fkey"
		}),
	unique("venues_google_place_id_key").on(table.googlePlaceId),
	check("venues_name_check", sql`(char_length(name) >= 2) AND (char_length(name) <= 120)`),
	check("venues_merged_not_self", sql`(merged_into_id IS NULL) OR (merged_into_id <> id)`),
]);

export const teams = pgTable("teams", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	sportId: smallint("sport_id").notNull(),
	ownerId: uuid("owner_id").notNull(),
	inviteCode: text("invite_code").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'date' }),
}, (table): PgTableExtraConfigValue[] => [
	index("teams_owner_idx").using("btree", table.ownerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sportId],
			foreignColumns: [sports.id],
			name: "teams_sport_id_fkey"
		}),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [profiles.userId],
			name: "teams_owner_id_fkey"
		}),
	unique("teams_invite_code_key").on(table.inviteCode),
	check("teams_name_check", sql`(char_length(name) >= 2) AND (char_length(name) <= 60)`),
]);

export const matches = pgTable("matches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sportId: smallint("sport_id").notNull(),
	venueId: uuid("venue_id").notNull(),
	organizerId: uuid("organizer_id").notNull(),
	teamId: uuid("team_id"),
	title: text().notNull(),
	description: text(),
	capacity: smallint().notNull(),
	level: skillLevel(),
	gender: matchGender().default('mixed').notNull(),
	pricePerPerson: numeric("price_per_person", { precision: 10, scale:  2 }),
	currency: char({ length: 3 }).default('ARS').notNull(),
	visibility: matchVisibility().default('public').notNull(),
	inviteCode: text("invite_code").notNull(),
	status: matchStatus().default('open').notNull(),
	autoConfirm: boolean("auto_confirm").default(false).notNull(),
	votingDeadline: timestamp("voting_deadline", { withTimezone: true, mode: 'date' }),
	confirmedSlotId: uuid("confirmed_slot_id"),
	contactLink: text("contact_link"),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'date' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'date' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table): PgTableExtraConfigValue[] => [
	index("matches_organizer_idx").using("btree", table.organizerId.asc().nullsLast().op("uuid_ops")),
	index("matches_status_sport_idx").using("btree", table.status.asc().nullsLast().op("int2_ops"), table.sportId.asc().nullsLast().op("int2_ops")),
	index("matches_team_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")).where(sql`(team_id IS NOT NULL)`),
	index("matches_venue_idx").using("btree", table.venueId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sportId],
			foreignColumns: [sports.id],
			name: "matches_sport_id_fkey"
		}),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "matches_venue_id_fkey"
		}),
	foreignKey({
			columns: [table.organizerId],
			foreignColumns: [profiles.userId],
			name: "matches_organizer_id_fkey"
		}),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "matches_team_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.id, table.confirmedSlotId],
			foreignColumns: [matchSlots.id, matchSlots.matchId],
			name: "matches_confirmed_slot_fk"
		}),
	unique("matches_invite_code_key").on(table.inviteCode),
	check("matches_title_check", sql`(char_length(title) >= 3) AND (char_length(title) <= 80)`),
	check("matches_description_check", sql`char_length(description) <= 1000`),
	check("matches_capacity_check", sql`(capacity >= 2) AND (capacity <= 30)`),
	check("matches_price_per_person_check", sql`price_per_person >= (0)::numeric`),
	check("matches_confirmed_has_slot", sql`(status <> ALL (ARRAY['confirmed'::match_status, 'played'::match_status])) OR (confirmed_slot_id IS NOT NULL)`),
]);

export const matchSlots = pgTable("match_slots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	matchId: uuid("match_id").notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'date' }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'date' }).notNull(),
}, (table): PgTableExtraConfigValue[] => [
	index("match_slots_starts_at_idx").using("btree", table.startsAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.matchId],
			foreignColumns: [matches.id],
			name: "match_slots_match_id_fkey"
		}).onDelete("cascade"),
	unique("match_slots_unique_start").on(table.startsAt, table.matchId),
	unique("match_slots_id_match_key").on(table.matchId, table.id),
	check("match_slots_valid_range", sql`ends_at > starts_at`),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: text().notNull(),
	matchId: uuid("match_id"),
	payload: jsonb().default({}).notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'date' }),
	sendEmail: boolean("send_email").default(true).notNull(),
	emailedAt: timestamp("emailed_at", { withTimezone: true, mode: 'date' }),
	emailAttempts: smallint("email_attempts").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table): PgTableExtraConfigValue[] => [
	index("notifications_email_pending_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(send_email AND (emailed_at IS NULL))`),
	index("notifications_unread_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(read_at IS NULL)`),
	index("notifications_user_created_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.userId],
			name: "notifications_user_id_fkey"
		}),
	foreignKey({
			columns: [table.matchId],
			foreignColumns: [matches.id],
			name: "notifications_match_id_fkey"
		}).onDelete("cascade"),
]);

export const venueSports = pgTable("venue_sports", {
	venueId: uuid("venue_id").notNull(),
	sportId: smallint("sport_id").notNull(),
}, (table): PgTableExtraConfigValue[] => [
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "venue_sports_venue_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sportId],
			foreignColumns: [sports.id],
			name: "venue_sports_sport_id_fkey"
		}),
	primaryKey({ columns: [table.venueId, table.sportId], name: "venue_sports_pkey"}),
]);

export const userSports = pgTable("user_sports", {
	userId: uuid("user_id").notNull(),
	sportId: smallint("sport_id").notNull(),
	level: skillLevel().notNull(),
}, (table): PgTableExtraConfigValue[] => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.userId],
			name: "user_sports_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sportId],
			foreignColumns: [sports.id],
			name: "user_sports_sport_id_fkey"
		}),
	primaryKey({ columns: [table.userId, table.sportId], name: "user_sports_pkey"}),
]);

export const teamMembers = pgTable("team_members", {
	teamId: uuid("team_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: teamRole().default('member').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table): PgTableExtraConfigValue[] => [
	index("team_members_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_members_team_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.userId],
			name: "team_members_user_id_fkey"
		}),
	primaryKey({ columns: [table.userId, table.teamId], name: "team_members_pkey"}),
]);

export const slotVotes = pgTable("slot_votes", {
	slotId: uuid("slot_id").notNull(),
	matchId: uuid("match_id").notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
}, (table): PgTableExtraConfigValue[] => [
	index("slot_votes_match_user_idx").using("btree", table.matchId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.slotId, table.matchId],
			foreignColumns: [matchSlots.id, matchSlots.matchId],
			name: "slot_votes_slot_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.matchId, table.userId],
			foreignColumns: [matchParticipants.matchId, matchParticipants.userId],
			name: "slot_votes_participant_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.slotId], name: "slot_votes_pkey"}),
]);

export const matchParticipants = pgTable("match_participants", {
	matchId: uuid("match_id").notNull(),
	userId: uuid("user_id").notNull(),
	status: participantStatus().default('interested').notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	statusChangedAt: timestamp("status_changed_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'date' }),
}, (table): PgTableExtraConfigValue[] => [
	index("match_participants_match_status_idx").using("btree", table.matchId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("match_participants_user_idx").using("btree", table.userId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.matchId],
			foreignColumns: [matches.id],
			name: "match_participants_match_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [profiles.userId],
			name: "match_participants_user_id_fkey"
		}),
	primaryKey({ columns: [table.userId, table.matchId], name: "match_participants_pkey"}),
]);
