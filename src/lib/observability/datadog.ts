import tracer from "dd-trace";

tracer.init({
  service: process.env.DD_SERVICE ?? "roomres",
  env: process.env.DD_ENV ?? process.env.VERCEL_ENV ?? "development",
  version: process.env.DD_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  logInjection: true,
  runtimeMetrics: true,
});

export default tracer;
