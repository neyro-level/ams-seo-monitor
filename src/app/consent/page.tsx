import { Suspense } from "react";
import { ConsentClient } from "./ConsentClient";

export const metadata = { title: "Подключение MCP", robots: { index: false, follow: false } };

export default function ConsentPage() {
  return <Suspense><ConsentClient /></Suspense>;
}
