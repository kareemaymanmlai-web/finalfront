import { analytics, files, members, notifications, roles, rooms, tenants } from "../data/mockData";
import { httpClient, shouldUseMockApi } from "./httpClient";

const delay = (value) => new Promise((resolve) => {
  window.setTimeout(() => resolve(value), 180);
});

function endpoint(path, mockValue) {
  if (shouldUseMockApi()) return delay(mockValue);
  return httpClient(path);
}

export const api = {
  getRoles: () => endpoint("/meta/roles", roles),
  getRooms: () => endpoint("/rooms", rooms),
  getFiles: () => endpoint("/files", files),
  getMembers: () => endpoint("/members", members),
  getTenants: () => endpoint("/tenants", tenants),
  getNotifications: () => endpoint("/notifications", notifications),
  getAnalytics: (scope) => endpoint(`/analytics?scope=${scope}`, analytics[scope] || []),

  createRoom: (payload) => shouldUseMockApi() ? delay({ id: Date.now(), ...payload }) : httpClient("/rooms", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  inviteMember: (payload) => shouldUseMockApi() ? delay({ id: Date.now(), ...payload }) : httpClient("/members/invite", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  createTenant: (payload) => shouldUseMockApi() ? delay({ id: Date.now(), ...payload }) : httpClient("/tenants", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  updateSubscription: (tenantId, payload) => shouldUseMockApi() ? delay({ tenantId, ...payload }) : httpClient(`/tenants/${tenantId}/subscription`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  })
};
