import { apiRequest } from "@/services/api";
import type { AdminOverview, AdminUserPage } from "@/domain/admin/types";

export const adminService = {
  overview: (signal?: AbortSignal) => apiRequest<AdminOverview>("/admin/overview", { signal, conditionalKey: "admin:overview" }),
  users: (query: string, signal?: AbortSignal) => apiRequest<AdminUserPage>(`/admin/users?${query}`, { signal }),
  rows: <T>(resource: string, signal?: AbortSignal) => apiRequest<T>(`/admin/${resource}`, { signal }),
  user: <T>(id: string, signal?: AbortSignal) => apiRequest<T>(`/admin/users/${encodeURIComponent(id)}`, { signal }),
  action: <T>(path: string, body: unknown) => apiRequest<T>(`/admin/${path}`, { method: "POST", body })
};
