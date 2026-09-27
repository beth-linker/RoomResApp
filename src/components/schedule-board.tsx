"use client";

import { format, parseISO } from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, Monitor, Users, Video, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cancelBookingAction } from "@/app/actions";
import { BookingForm } from "@/components/booking-form";

type RoomItem = { id: string; name: string; capacity: number; color: string; amenities: string[] };
type BookingItem = { id: string; roomId: string; organizerId: string; organizerName: string; title: string; notes: string | null; startsAt: string; endsAt: string; canManage: boolean };

const iconFor = (amenity: string) => amenity.toLowerCase().includes("video") ? Video : amenity.toLowerCase().includes("display") ? Monitor : Users;
const easternDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function ScheduleBoard({ rooms, bookings, dates, currentUserId }: { rooms: RoomItem[]; bookings: BookingItem[]; dates: string[]; currentUserId: string }) {
  const today = easternDate.format(new Date());
  const initialIndex = Math.max(0, dates.indexOf(today));
  const [dayIndex, setDayIndex] = useState(initialIndex);
  const [roomId, setRoomId] = useState<string | undefined>();
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedDate = dates[dayIndex] ?? dates[0];
  const bookingsByRoom = useMemo(() => {
    const grouped = new Map<string, BookingItem[]>();
    for (const booking of bookings) {
      if (easternDate.format(new Date(booking.startsAt)) !== selectedDate) continue;
      const roomBookings = grouped.get(booking.roomId) ?? [];
      roomBookings.push(booking);
      grouped.set(booking.roomId, roomBookings);
    }
    return grouped;
  }, [bookings, selectedDate]);

  function openBooking(selectedRoomId?: string) {
    setRoomId(selectedRoomId);
    dialog.current?.showModal();
  }

  return <>
    <div className="card" style={{ padding: ".75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", marginBottom: "1rem" }}>
      <button className="button button-quiet" aria-label="Previous day" disabled={dayIndex === 0} onClick={() => setDayIndex((value) => Math.max(0, value - 1))}><ChevronLeft size={19} /></button>
      <div style={{ textAlign: "center" }}><div className="eyebrow">Eastern time</div><strong style={{ fontSize: "1.1rem" }}>{format(parseISO(`${selectedDate}T12:00:00`), "EEEE, MMMM d")}</strong></div>
      <button className="button button-quiet" aria-label="Next day" disabled={dayIndex === dates.length - 1} onClick={() => setDayIndex((value) => Math.min(dates.length - 1, value + 1))}><ChevronRight size={19} /></button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))", gap: "1rem" }}>
      {rooms.map((room, index) => {
        const roomBookings = bookingsByRoom.get(room.id) ?? [];
        return <article className="card enter" key={room.id} style={{ padding: "1rem", animationDelay: `${index * 40}ms`, borderTop: `7px solid ${room.color}` }}>
          <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: ".5rem" }}><div><h2 style={{ margin: 0, fontSize: "1.35rem", letterSpacing: "-.03em" }}>{room.name}</h2><div className="hint" style={{ display: "flex", alignItems: "center", gap: ".35rem", marginTop: ".25rem" }}><Users size={14} />Up to {room.capacity}</div></div><button className="button button-secondary" onClick={() => openBooking(room.id)} aria-label={`Book ${room.name}`}><CalendarPlus size={17} />Book</button></header>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".35rem", margin: ".8rem 0" }}>{room.amenities.map((amenity) => { const Icon = iconFor(amenity); return <span key={amenity} className="pill" style={{ background: `${room.color}24` }}><Icon size={13} />{amenity}</span>; })}</div>
          <div style={{ display: "grid", gap: ".55rem", marginTop: ".8rem" }}>
            {roomBookings.length === 0 && <div style={{ border: "1px dashed #cfd4e2", borderRadius: ".9rem", padding: "1rem", textAlign: "center" }}><span className="hint">Wide open. Make some plans!</span></div>}
            {roomBookings.map((booking) => <div key={booking.id} style={{ borderRadius: ".9rem", background: booking.organizerId === currentUserId ? "#eeebff" : "#f7f8fc", padding: ".75rem", borderLeft: `4px solid ${room.color}` }}><div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}><div><strong>{booking.title}</strong><div className="hint" style={{ marginTop: ".2rem" }}><Clock size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> {new Date(booking.startsAt).toLocaleTimeString([], { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })}–{new Date(booking.endsAt).toLocaleTimeString([], { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })} · {booking.organizerName}</div>{booking.notes && <div className="hint" style={{ marginTop: ".4rem", color: "#3d4761" }}>{booking.notes}</div>}</div>{booking.canManage && <form action={cancelBookingAction}><input name="bookingId" type="hidden" value={booking.id} /><button className="button button-danger" style={{ minHeight: 32, padding: ".35rem" }} aria-label={`Cancel ${booking.title}`}><X size={15} /></button></form>}</div></div>)}
          </div>
        </article>;
      })}
    </div>

    <dialog ref={dialog} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }} style={{ width: "min(92vw, 500px)", border: 0, borderRadius: "1.5rem", padding: 0, boxShadow: "0 30px 90px rgba(30,34,74,.3)" }}>
      <div style={{ padding: "1.4rem" }}><header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}><div><div className="eyebrow">New booking</div><h2 style={{ margin: ".25rem 0 0" }}>Claim a room</h2></div><button className="button button-quiet" onClick={() => dialog.current?.close()} aria-label="Close"><X size={18} /></button></header><BookingForm rooms={rooms.map(({id,name}) => ({id,name}))} defaultDate={selectedDate} defaultRoomId={roomId} /></div>
    </dialog>
  </>;
}
