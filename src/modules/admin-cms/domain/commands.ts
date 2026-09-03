export const ADMIN_COMMAND_NAMES = [
  "saveOrganization",
  "saveMembership",
  "removeMembership",
  "saveProject",
  "saveSite",
  "saveProviderConnection",
  "saveGoal",
  "replaceTrackedQuerySet",
  "saveThresholdProfile",
  "saveClusterProfile",
  "requestProjectSync",
] as const;

export type AdminCommandName = (typeof ADMIN_COMMAND_NAMES)[number];
