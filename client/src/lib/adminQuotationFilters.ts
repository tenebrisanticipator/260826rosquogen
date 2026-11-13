export const adminDateRanges = [
  { value: "all", label: "Any date" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

export type AdminDateRange = (typeof adminDateRanges)[number]["value"];
export type AdminQuotationSort = "newest" | "oldest" | "highest_cost" | "lowest_cost" | "customer_name";
export type AdminQuotationStatus = "all" | "draft" | "generated" | "sent" | "accepted" | "expired";

export function startOfAdminDateRange(range: AdminDateRange, now = new Date()) {
  if (range === "all") return undefined;
  const date = new Date(now);
  date.setDate(date.getDate() - Number(range));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function buildAdminQuotationListInput(filters: {
  query: string;
  status: AdminQuotationStatus;
  creatorId: string;
  plantSize: string;
  dateRange: AdminDateRange;
  sort: AdminQuotationSort;
}, now = new Date()) {
  return {
    query: filters.query || undefined,
    status: filters.status === "all" ? undefined : filters.status,
    userId: filters.creatorId ? Number(filters.creatorId) : undefined,
    plantSize: filters.plantSize || undefined,
    dateFrom: startOfAdminDateRange(filters.dateRange, now),
    sort: filters.sort,
    page: 1,
    pageSize: 6,
  };
}
