import type {
  CreateSourceRunInput,
  CreateSyncRunInput,
  FinishSourceRunInput,
  FinishSyncRunInput,
  StoreLandingPageMetricsInput,
  StoreMetrikaDailyMetricsInput,
  StoreMetrikaDeviceMetricsInput,
  StoreMetrikaGoalMetricsInput,
  StoreRankingCapturesInput,
  StoreReportSnapshotInput,
  StoreTechnicalSnapshotsInput,
  StoreWebmasterDailyMetricsInput,
  StoreWebmasterQueryMetricsInput,
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

  storeWebmasterDailyMetrics(input: StoreWebmasterDailyMetricsInput) {
    return this.syncRepository.storeWebmasterDailyMetrics(input);
  }

  storeWebmasterQueryMetrics(input: StoreWebmasterQueryMetricsInput) {
    return this.syncRepository.storeWebmasterQueryMetrics(input);
  }

  storeMetrikaDailyMetrics(input: StoreMetrikaDailyMetricsInput) {
    return this.syncRepository.storeMetrikaDailyMetrics(input);
  }

  storeLandingPageMetrics(input: StoreLandingPageMetricsInput) {
    return this.syncRepository.storeLandingPageMetrics(input);
  }

  storeMetrikaDeviceMetrics(input: StoreMetrikaDeviceMetricsInput) {
    return this.syncRepository.storeMetrikaDeviceMetrics(input);
  }

  storeMetrikaGoalMetrics(input: StoreMetrikaGoalMetricsInput) {
    return this.syncRepository.storeMetrikaGoalMetrics(input);
  }

  storeRankingCaptures(input: StoreRankingCapturesInput) {
    return this.syncRepository.storeRankingCaptures(input);
  }

  storeTechnicalSnapshots(input: StoreTechnicalSnapshotsInput) {
    return this.syncRepository.storeTechnicalSnapshots(input);
  }

  listTrackedQueriesForSite(siteId: string) {
    return this.syncRepository.listTrackedQueriesForSite(siteId);
  }
}
