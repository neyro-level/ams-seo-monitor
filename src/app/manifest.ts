import type { MetadataRoute } from "next";
import { getPwaManifest } from "../platform/pwa/manifest.ts";

export default function manifest(): MetadataRoute.Manifest {
  return getPwaManifest();
}
