export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DD_ENABLED === "true") {
    await import("@/lib/observability/datadog");
  }
}
