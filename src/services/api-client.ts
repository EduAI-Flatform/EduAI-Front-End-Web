const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export function getApiBaseUrl() {
  return API_BASE_URL;
}
