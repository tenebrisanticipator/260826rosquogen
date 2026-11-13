export const DEFAULT_PANEL_TYPES = ["Mono", "Poly", "Bifacial", "TOPCon", "Mono PERC", "Other"] as const;

export function calculatePlantSizeKw(panelWatt: number, numberOfPanels: number): number {
  if (!Number.isFinite(panelWatt) || !Number.isFinite(numberOfPanels) || panelWatt <= 0 || numberOfPanels <= 0) {
    return 0;
  }
  return Number(((panelWatt * numberOfPanels) / 1000).toFixed(2));
}

export function formatIndianCurrency(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPlantSize(value: number | string | null | undefined): string {
  const numberValue = Number(value ?? 0);
  return `${Number.isFinite(numberValue) ? numberValue.toFixed(2) : "0.00"} kW`;
}

export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return null;
  const url = new URL(`https://wa.me/${normalized}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}

export function quotationNumberFor(year: number, sequence: number): string {
  return `RS-${year}-${String(sequence).padStart(5, "0")}`;
}
