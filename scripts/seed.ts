import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { rooms } from "../src/db/schema";

const roomSeeds = [
  { name: "Doc", capacity: 12, color: "#5B6FE8", amenities: ["Large display", "Video conferencing", "Whiteboard"] },
  { name: "Grumpy", capacity: 8, color: "#EF6C63", amenities: ["Display", "Video conferencing", "Whiteboard"] },
  { name: "Happy", capacity: 6, color: "#F2B84B", amenities: ["Display", "Video conferencing"] },
  { name: "Sleepy", capacity: 6, color: "#8B72CC", amenities: ["Display", "Whiteboard"] },
  { name: "Bashful", capacity: 4, color: "#E882AE", amenities: ["Display", "Whiteboard"] },
  { name: "Sneezy", capacity: 3, color: "#4CAFC4", amenities: ["Display"] },
  { name: "Dopey", capacity: 2, color: "#64B982", amenities: ["Whiteboard"] },
];

async function main() {
  const db = getDb();
  for (const room of roomSeeds) {
    const [existing] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.name, room.name)).limit(1);
    if (existing) {
      await db.update(rooms).set({ ...room, active: true, updatedAt: new Date() }).where(eq(rooms.id, existing.id));
    } else {
      await db.insert(rooms).values(room);
    }
  }
  console.log(`Seeded ${roomSeeds.length} RoomRes rooms.`);
}

main().catch((error) => {
  console.error("Room seed failed.", error);
  process.exitCode = 1;
});
