const tone: Record<string, string> = {
  pending: "bg-jeep/30 text-amber-900", approved: "bg-teal/15 text-teal", confirmed: "bg-teal/15 text-teal",
  ongoing: "bg-sky-100 text-sky-800", completed: "bg-bay/10 text-bay", verified: "bg-teal/15 text-teal",
  paid: "bg-teal/15 text-teal", downpayment_paid: "bg-teal/15 text-teal", held: "bg-jeep/30 text-amber-900",
  cancelled: "bg-coral/15 text-coral", rejected: "bg-coral/15 text-coral", suspended: "bg-coral/15 text-coral",
  needs_update: "bg-jeep/30 text-amber-900",
};
export default function Badge({ status }: { status: string }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold capitalize ${tone[status] ?? "bg-bay/10 text-bay"}`}>{status.replace(/_/g, " ")}</span>;
}
