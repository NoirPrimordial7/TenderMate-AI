import { ADMIN_AUTHORIZATION_INVALIDATED_EVENT, apiRequest } from "@/services/api";
import type { AdminOverview, AdminUserPage } from "@/domain/admin/types";

export const adminService = {
  overview: (signal?: AbortSignal) => apiRequest<AdminOverview>("/admin/overview", { signal }),
  users: (query: string, signal?: AbortSignal) => apiRequest<AdminUserPage>(`/admin/users?${query}`, { signal }),
  rows: <T>(resource: string, signal?: AbortSignal) => apiRequest<T>(`/admin/${resource}`, { signal }),
  user: <T>(id: string, signal?: AbortSignal) => apiRequest<T>(`/admin/users/${encodeURIComponent(id)}`, { signal }),
  action: async <T>(path: string, body: unknown) => {
    const response = await apiRequest<T>(`/admin/${path}`, { method: "POST", body });
    if (typeof window !== "undefined" && /\/(role|status|sessions\/revoke|access-grants)(\/|$)/.test(`/${path}`)) {
      window.dispatchEvent(new Event(ADMIN_AUTHORIZATION_INVALIDATED_EVENT));
    }
    return response;
  }
};
