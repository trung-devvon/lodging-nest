export interface BookingActorContext {
  organizationId: string;
  userId: string;
  role: string;
  staffId?: string;
  branchId?: string | null;
  actorIp?: string;
}
