export type AppRole = "admin" | "user";

export function homePathForRole(role: AppRole) {
  return role === "admin" ? "/admin/dashboard" : "/home";
}

export function canAccessAdministration(role: AppRole) {
  return role === "admin";
}
