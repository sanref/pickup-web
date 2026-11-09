import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addDaysToKey, isDateKey, todayIn, weekStartKey } from "@/lib/dates";
import { listBookings, listCourts, listTentativeSlots } from "@/server/services/venue-admin";
import { loadManagedVenue } from "../load";
import { BookingCalendar, type CalendarView } from "./booking-calendar";

export const metadata: Metadata = { title: "Turnos" };

export default async function BookingsPage({ params, searchParams }: PageProps<"/gestion/[venueId]/turnos">) {
  const { venueId } = await params;
  const query = await searchParams;
  const { venue } = await loadManagedVenue(venueId);

  const today = todayIn(venue.timezone);
  const date = isDateKey(query.fecha) ? query.fecha : today;
  const view: CalendarView = query.vista === "semana" ? "week" : "day";
  const from = view === "week" ? weekStartKey(date) : date;
  const to = addDaysToKey(from, view === "week" ? 7 : 1);

  const [courts, bookings, tentative] = await Promise.all([
    listCourts(venue.id),
    listBookings(venue, from, to),
    listTentativeSlots(venue, from, to),
  ]);

  // Las desactivadas solo aparecen si tienen turnos en el período (para no perderlos de vista).
  const visibleCourts = courts.filter((c) => c.isActive || bookings.some((b) => b.courtId === c.id));
  if (visibleCourts.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-edge bg-surface p-6">
        <p className="m-0 text-sm text-text-2">Para dar turnos, primero cargá las canchas de la sede.</p>
        <Button asChild>
          <Link href={`/gestion/${venue.id}/canchas`}>Cargar canchas</Link>
        </Button>
      </div>
    );
  }
  const requested = typeof query.cancha === "string" ? query.cancha : null;
  const selectedCourtId = visibleCourts.some((c) => c.id === requested) ? requested! : visibleCourts[0].id;

  return (
    <BookingCalendar
      venueId={venue.id}
      timezone={venue.timezone}
      view={view}
      date={date}
      from={from}
      today={today}
      selectedCourtId={selectedCourtId}
      courts={visibleCourts.map(({ id, name, sportName, slotMinutes, isActive }) => ({ id, name, sportName, slotMinutes, isActive }))}
      bookings={bookings.map((b) => ({ ...b, startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString() }))}
      tentative={tentative.map((t) => ({ ...t, startsAt: t.startsAt.toISOString(), endsAt: t.endsAt.toISOString() }))}
    />
  );
}
