import { relations } from "drizzle-orm/relations";
import { profiles, venues, sports, teams, matches, matchSlots, notifications, courts, courtBookings, venueSports, userSports, venueManagers, teamMembers, slotVotes, matchParticipants } from "./schema";

export const venuesRelations = relations(venues, ({one, many}) => ({
	profile_createdBy: one(profiles, {
		fields: [venues.createdBy],
		references: [profiles.userId],
		relationName: "venues_createdBy_profiles_userId"
	}),
	profile_reviewedBy: one(profiles, {
		fields: [venues.reviewedBy],
		references: [profiles.userId],
		relationName: "venues_reviewedBy_profiles_userId"
	}),
	venue: one(venues, {
		fields: [venues.mergedIntoId],
		references: [venues.id],
		relationName: "venues_mergedIntoId_venues_id"
	}),
	venues: many(venues, {
		relationName: "venues_mergedIntoId_venues_id"
	}),
	courts: many(courts),
	matches: many(matches),
	venueSports: many(venueSports),
	venueManagers: many(venueManagers),
}));

export const profilesRelations = relations(profiles, ({many}) => ({
	venues_createdBy: many(venues, {
		relationName: "venues_createdBy_profiles_userId"
	}),
	venues_reviewedBy: many(venues, {
		relationName: "venues_reviewedBy_profiles_userId"
	}),
	teams: many(teams),
	notifications: many(notifications),
	courtBookings: many(courtBookings),
	matches: many(matches),
	userSports: many(userSports),
	venueManagers_userId: many(venueManagers, {
		relationName: "venueManagers_userId_profiles_userId"
	}),
	venueManagers_addedBy: many(venueManagers, {
		relationName: "venueManagers_addedBy_profiles_userId"
	}),
	teamMembers: many(teamMembers),
	matchParticipants: many(matchParticipants),
}));

export const teamsRelations = relations(teams, ({one, many}) => ({
	sport: one(sports, {
		fields: [teams.sportId],
		references: [sports.id]
	}),
	profile: one(profiles, {
		fields: [teams.ownerId],
		references: [profiles.userId]
	}),
	matches: many(matches),
	teamMembers: many(teamMembers),
}));

export const sportsRelations = relations(sports, ({many}) => ({
	teams: many(teams),
	courts: many(courts),
	matches: many(matches),
	venueSports: many(venueSports),
	userSports: many(userSports),
}));

export const matchSlotsRelations = relations(matchSlots, ({one, many}) => ({
	match: one(matches, {
		fields: [matchSlots.matchId],
		references: [matches.id],
		relationName: "matchSlots_matchId_matches_id"
	}),
	matches: many(matches, {
		relationName: "matches_id_matchSlots_id"
	}),
	slotVotes: many(slotVotes),
}));

export const matchesRelations = relations(matches, ({one, many}) => ({
	matchSlots: many(matchSlots, {
		relationName: "matchSlots_matchId_matches_id"
	}),
	notifications: many(notifications),
	courtBookings: many(courtBookings),
	sport: one(sports, {
		fields: [matches.sportId],
		references: [sports.id]
	}),
	venue: one(venues, {
		fields: [matches.venueId],
		references: [venues.id]
	}),
	profile: one(profiles, {
		fields: [matches.organizerId],
		references: [profiles.userId]
	}),
	team: one(teams, {
		fields: [matches.teamId],
		references: [teams.id]
	}),
	matchSlot: one(matchSlots, {
		fields: [matches.id],
		references: [matchSlots.id],
		relationName: "matches_id_matchSlots_id"
	}),
	court: one(courts, {
		fields: [matches.venueId],
		references: [courts.id]
	}),
	matchParticipants: many(matchParticipants),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	profile: one(profiles, {
		fields: [notifications.userId],
		references: [profiles.userId]
	}),
	match: one(matches, {
		fields: [notifications.matchId],
		references: [matches.id]
	}),
}));

export const courtsRelations = relations(courts, ({one, many}) => ({
	venue: one(venues, {
		fields: [courts.venueId],
		references: [venues.id]
	}),
	sport: one(sports, {
		fields: [courts.sportId],
		references: [sports.id]
	}),
	courtBookings: many(courtBookings),
	matches: many(matches),
}));

export const courtBookingsRelations = relations(courtBookings, ({one}) => ({
	court: one(courts, {
		fields: [courtBookings.courtId],
		references: [courts.id]
	}),
	match: one(matches, {
		fields: [courtBookings.matchId],
		references: [matches.id]
	}),
	profile: one(profiles, {
		fields: [courtBookings.createdBy],
		references: [profiles.userId]
	}),
}));

export const venueSportsRelations = relations(venueSports, ({one}) => ({
	venue: one(venues, {
		fields: [venueSports.venueId],
		references: [venues.id]
	}),
	sport: one(sports, {
		fields: [venueSports.sportId],
		references: [sports.id]
	}),
}));

export const userSportsRelations = relations(userSports, ({one}) => ({
	profile: one(profiles, {
		fields: [userSports.userId],
		references: [profiles.userId]
	}),
	sport: one(sports, {
		fields: [userSports.sportId],
		references: [sports.id]
	}),
}));

export const venueManagersRelations = relations(venueManagers, ({one}) => ({
	venue: one(venues, {
		fields: [venueManagers.venueId],
		references: [venues.id]
	}),
	profile_userId: one(profiles, {
		fields: [venueManagers.userId],
		references: [profiles.userId],
		relationName: "venueManagers_userId_profiles_userId"
	}),
	profile_addedBy: one(profiles, {
		fields: [venueManagers.addedBy],
		references: [profiles.userId],
		relationName: "venueManagers_addedBy_profiles_userId"
	}),
}));

export const teamMembersRelations = relations(teamMembers, ({one}) => ({
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id]
	}),
	profile: one(profiles, {
		fields: [teamMembers.userId],
		references: [profiles.userId]
	}),
}));

export const slotVotesRelations = relations(slotVotes, ({one}) => ({
	matchSlot: one(matchSlots, {
		fields: [slotVotes.slotId],
		references: [matchSlots.id]
	}),
	matchParticipant: one(matchParticipants, {
		fields: [slotVotes.matchId],
		references: [matchParticipants.matchId]
	}),
}));

export const matchParticipantsRelations = relations(matchParticipants, ({one, many}) => ({
	slotVotes: many(slotVotes),
	match: one(matches, {
		fields: [matchParticipants.matchId],
		references: [matches.id]
	}),
	profile: one(profiles, {
		fields: [matchParticipants.userId],
		references: [profiles.userId]
	}),
}));