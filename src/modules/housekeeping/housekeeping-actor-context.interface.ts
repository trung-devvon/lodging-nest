export interface HousekeepingActorContext {
  organizationId: string;
  userId: string;
  role: string;
  staffId?: string;
  branchId?: string | null;
  staffRole?: string;
  actorIp?: string;
}
