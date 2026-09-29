export const BLOCKING = ["approved", "confirmed", "ongoing"];  
export const DEFAULT_SERVICE_FEE_PCT = 10;    
export const DEFAULT_DOWNPAYMENT_PCT = 30;
export const DEFAULT_CANCELLATION_FEE_PCT = 10;
 
export const diffDays = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export function quote(pricePerDay: number, start: string, end: string, feePct = DEFAULT_SERVICE_FEE_PCT, downPct = DEFAULT_DOWNPAYMENT_PCT) {
  const days = Math.max(0, diffDays(start, end));
  const total = days * pricePerDay;
  const serviceFee = Math.round((total * feePct) / 100);
  return { days, total, serviceFee, ownerPayout: total - serviceFee, downpayment: Math.round((total * downPct) / 100) };
}
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export const peso = (amount?: number | null): string => {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "₱0.00";
  }

  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// ---- Platform service fee (mirrors PLATFORM_FEE_PERCENT on the backend) ----
export const feeSplit = (amount: number, pct = DEFAULT_SERVICE_FEE_PCT) => {
  const fee = Math.round(amount * pct) / 100;
  return { fee, ownerShare: Math.round((amount - fee) * 100) / 100 };
};
// Bookings created before the fee existed have no snapshot, so fall back to the default rate.
export const feeOf = (b: { totalPrice: number; serviceFee?: number }) => b.serviceFee ?? feeSplit(b.totalPrice).fee;
export const payoutOf = (b: { totalPrice: number; ownerPayout?: number }) => b.ownerPayout ?? feeSplit(b.totalPrice).ownerShare;