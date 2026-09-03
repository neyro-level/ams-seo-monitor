import { readPublicLeadsEnvironment } from "../src/platform/config/public-environment";
import {
  readAuthEnvironment,
  readDatabaseEnvironment,
} from "../src/platform/config/server-environment";

readDatabaseEnvironment(process.env);
const authEnvironment = readAuthEnvironment(process.env);
if (!authEnvironment) {
  throw new Error("Better Auth environment is required for web runtime");
}
readPublicLeadsEnvironment({
  NEXT_PUBLIC_LEADS_API_URL: process.env.NEXT_PUBLIC_LEADS_API_URL,
  NEXT_PUBLIC_LEADS_PROJECT_ID: process.env.NEXT_PUBLIC_LEADS_PROJECT_ID,
  NEXT_PUBLIC_LEADS_SITE_KEY: process.env.NEXT_PUBLIC_LEADS_SITE_KEY,
});

process.stdout.write("web_environment=valid\n");
