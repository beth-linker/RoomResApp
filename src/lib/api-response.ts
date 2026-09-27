import { ZodError } from "zod";

export type ApiErrorCode =
  | "authentication_required"
  | "forbidden"
  | "not_found"
  | "invalid_request"
  | "booking_conflict"
  | "internal_error";

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      error: {
        code: "authentication_required",
        message: "Supply a valid API token in the Authorization header.",
      },
    }),
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="RoomRes API"',
      },
    },
  );
}

export function invalidRequestResponse(error: unknown) {
  if (error instanceof ZodError) {
    return apiError(422, "invalid_request", "The request is invalid.", error.issues);
  }
  if (error instanceof SyntaxError) {
    return apiError(400, "invalid_request", "The request body must be valid JSON.");
  }
  return apiError(500, "internal_error", "The request could not be completed.");
}

export function pgErrorCode(error: unknown) {
  return (
    (error as { cause?: { code?: string } }).cause?.code ??
    (error as { code?: string }).code
  );
}
