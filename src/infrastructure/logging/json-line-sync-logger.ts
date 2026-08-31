import type { SyncLogEvent, SyncLogger } from "../../application/ports/sync-logger";

export class JsonLineSyncLogger implements SyncLogger {
  log(event: SyncLogEvent): void {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }
}
