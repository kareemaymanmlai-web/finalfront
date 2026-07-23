import { organizationMemberships, organizations } from "../data/organizationData";
import { modulesForOrganization, permissionsForMembership } from "../domain/organization";
import { shouldUseMockApi, httpClient } from "./httpClient";

const wait = (value) => new Promise((resolve) => window.setTimeout(() => resolve(value), 120));

function hydrateMembership(membership) {
  const organization = organizations.find((item) => item.id === membership.organizationId);
  if (!organization) return null;
  return {
    ...membership,
    organization,
    permissions: permissionsForMembership(membership),
    modules: modulesForOrganization(organization)
  };
}

export const organizationRepository = {
  async listMemberships(user) {
    if (!user) return [];
    if (!shouldUseMockApi()) return httpClient("/users/me/organization-memberships");
    const mapped = organizationMemberships[user.email] || [];
    if (mapped.length) return wait(mapped.map(hydrateMembership).filter(Boolean));
    if (!user.tenantId) return wait([]);
    const fallback = organizations.find((item) => item.name === user.company) || organizations[0];
    return wait([hydrateMembership({ organizationId: fallback.id, role: user.role === "tenant-admin" ? "organization_admin" : "member", status: "active" })]);
  }
};
