import type { ReactNode } from "react";
export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block"><span className="label">{label}</span>{children}</label>
);
export const ErrorNote = ({ text }: { text: string }) =>
  text ? <p role="alert" className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{text}</p> : null;
