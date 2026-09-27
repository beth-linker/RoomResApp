import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { rooms } from "@/db/schema";
import { unauthorizedResponse } from "@/lib/api-response";
import { authenticateApiRequest } from "@/lib/api-tokens";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const principal = await authenticateApiRequest(request);
  if (!principal) return unauthorizedResponse();

  const rows = await getDb()
    .select({
      id: rooms.id,
      name: rooms.name,
      capacity: rooms.capacity,
      color: rooms.color,
      amenities: rooms.amenities,
    })
    .from(rooms)
    .where(eq(rooms.active, true))
    .orderBy(asc(rooms.name));

  return Response.json({ data: rows }, { headers: { "Cache-Control": "no-store" } });
}
