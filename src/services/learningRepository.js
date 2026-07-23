import { learningSeed } from "../data/learningData";
import { httpClient, shouldUseMockApi } from "./httpClient";

const ENTITY_KEYS = ["courses", "batches", "bookings", "enrollments", "announcements", "meetings", "tasks"];

function storageKey(organizationId) {
  return `ain-learning-workspace:${organizationId}`;
}

function seedForOrganization(organizationId) {
  return Object.fromEntries(ENTITY_KEYS.map((key) => [key, learningSeed[key].filter((item) => item.organizationId === organizationId)]));
}

export const learningRepository = {
  async loadWorkspace(organizationId) {
    if (!shouldUseMockApi()) return httpClient(`/organizations/${organizationId}/learning-workspace`);
    const saved = window.localStorage.getItem(storageKey(organizationId));
    if (saved) {
      try { return JSON.parse(saved); } catch { window.localStorage.removeItem(storageKey(organizationId)); }
    }
    return seedForOrganization(organizationId);
  },

  async saveWorkspace(organizationId, data) {
    if (!shouldUseMockApi()) return httpClient(`/organizations/${organizationId}/learning-workspace`, { method: "PUT", body: JSON.stringify(data) });
    window.localStorage.setItem(storageKey(organizationId), JSON.stringify(data));
    return data;
  }
};
