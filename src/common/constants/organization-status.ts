import { OrganizationStatus, UserRole } from '@prisma/client';

export const WORKSPACE_ACTIVE_ORGANIZATION_STATUSES = [
  OrganizationStatus.ACTIVE,
  OrganizationStatus.ACTIVE_FREE_TRIAL,
] as const;

const WORKSPACE_ACTIVE_ORGANIZATION_STATUS_SET = new Set<OrganizationStatus>(
  WORKSPACE_ACTIVE_ORGANIZATION_STATUSES,
);

export function isWorkspaceAccessibleStatus(status: OrganizationStatus) {
  return WORKSPACE_ACTIVE_ORGANIZATION_STATUS_SET.has(status);
}

export function requiresOrganizationAccess(role?: string | null) {
  return role !== UserRole.SUPER_ADMIN;
}
