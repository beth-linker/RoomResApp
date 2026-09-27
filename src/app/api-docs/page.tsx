import type { Metadata } from "next";
import { SwaggerDocs } from "./swagger-docs";

export const metadata: Metadata = { title: "REST API documentation" };

export default function ApiDocsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "white" }}>
      <SwaggerDocs />
    </main>
  );
}
