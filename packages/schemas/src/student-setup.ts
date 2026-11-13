// Setup exceptions skip only academic onboarding. Session, Workspace, role and
// owner/tenant checks still run in the server and database for every operation.
export function canImportBeforeOnboarding(path: string): boolean {
  return ["/app/onboarding", "/app/connect", "/app/schedule"].includes(path.split("?")[0]);
}
export function canMutateBeforeOnboarding(kind: string): boolean {
  return [
    "profile_save",
    "connect_data_import",
    "connect_data_delete",
    "connect_schedule_import",
    "connect_schedule_delete",
  ].includes(kind);
}
