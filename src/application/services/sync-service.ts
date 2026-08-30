import type {
  CreateSourceRunInput,
  CreateSyncRunInput,
  FinishSourceRunInput,
  FinishSyncRunInput,
  StoreReportSnapshotInput,
  SyncRepository,
} from "../ports/sync-repository";

export class SyncService {
  constructor(private readonly syncRepository: SyncRepository) {}

  createSyncRun(input: CreateSyncRunInput) {
    return this.syncRepository.createSyncRun(input);
  }

  createSourceRun(input: CreateSourceRunInput) {
    return this.syncRepository.createSourceRun(input);
  }

  finishSourceRun(input: FinishSourceRunInput) {
    return this.syncRepository.finishSourceRun(input);
  }

  finishSyncRun(input: FinishSyncRunInput) {
    return this.syncRepository.finishSyncRun(input);
  }

  storeReportSnapshot(input: StoreReportSnapshotInput) {
    return this.syncRepository.storeReportSnapshot(input);
  }
}
