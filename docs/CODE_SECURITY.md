# Code Security lab

RoomRes keeps its Datadog integration isolated so it can be disabled after the trial without changing product behavior.

## Repository scanning

1. Install the Datadog GitHub integration for this public repository.
2. Add `DD_API_KEY` and `DD_APP_KEY` as GitHub Actions secrets. The application key needs the `code_analysis_read` scope.
3. Push to the default branch. The workflow runs SAST and SCA only when both secrets exist.
4. Enable pull-request comments and gates in Datadog after the first default-branch scan appears.

The repository policy is in `code-security.datadog.yaml`. Secret values must stay in GitHub or Vercel settings and never in this repository.

## Runtime lab

Runtime tracing is behind `DD_ENABLED=true`. With the variable absent or false, the tracer module is not loaded. The `security-lab` Docker Compose profile provides a place to attach a Datadog Agent later for APM, runtime SCA, and IAST experiments; those tools are deliberately separate from the Vercel deployment.

## Turn it off

- Remove the two Datadog repository secrets or disable the Code Security workflow.
- Remove `DD_ENABLED` from the runtime environment.
- If desired, delete `src/instrumentation.ts`, `src/lib/observability`, the Datadog workflow/config, and the `dd-trace` dependency. No RoomRes feature depends on them.
