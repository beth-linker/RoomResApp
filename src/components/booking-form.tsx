"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useActionState } from "react";
import { createBookingAction } from "@/app/actions";
import { initialActionState } from "@/lib/action-state";

export function BookingForm({ rooms, defaultDate, defaultRoomId }: { rooms: { id: string; name: string }[]; defaultDate: string; defaultRoomId?: string }) {
  const [state, action, pending] = useActionState(createBookingAction, initialActionState);
  return (
    <form action={action} style={{ display: "grid", gap: ".9rem" }}>
      <label className="label">Room<select className="field" name="roomId" defaultValue={defaultRoomId ?? rooms[0]?.id} required>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
      <label className="label">Meeting title<input className="field" name="title" maxLength={100} required placeholder="Design jam" /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
        <label className="label">Date<input className="field" name="date" type="date" defaultValue={defaultDate} required /></label>
        <label className="label">Start<input className="field" name="startTime" type="time" min="08:00" max="17:45" step={900} defaultValue="09:00" required /></label>
      </div>
      <label className="label">Length<select className="field" name="durationMinutes" defaultValue="30">{[15,30,45,60,75,90,105,120].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : minutes === 60 ? "1 hour" : minutes === 120 ? "2 hours" : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`}</option>)}</select></label>
      <label className="label">Private notes <span className="hint" style={{ fontWeight: 500 }}>Only you and admins can see these.</span><textarea className="field" name="notes" maxLength={1000} placeholder="Video link, prep notes…" /></label>
      {state.message && <div className={`alert ${state.status === "error" ? "alert-error" : "alert-success"}`} role="status">{state.message}</div>}
      <button className="button button-primary" disabled={pending || rooms.length === 0} type="submit">{pending ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}Reserve it</button>
    </form>
  );
}
