// Review dates: "September 29, 2026". Pinned to Manila so the day doesn't shift by viewer timezone.
export const formatReviewDate = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" });
};