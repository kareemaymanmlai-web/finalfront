const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

export function shouldUseMockApi() {
  return USE_MOCK_API || !API_BASE_URL;
}

export async function httpClient(path, options = {}) {
  const token = window.localStorage.getItem("aiofront_token") || window.sessionStorage.getItem("aiofront_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}
