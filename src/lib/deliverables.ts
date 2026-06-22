import type { DeliverableKind } from "@/server/db/schema";

/** Human labels for deliverable kinds — shared by the list, editor, and badges. */
export const DELIVERABLE_KINDS: { value: DeliverableKind; label: string }[] = [
  { value: "plan", label: "Plan" },
  { value: "ad_copy", label: "Ad Copy" },
  { value: "calendar", label: "Calendar" },
  { value: "seo", label: "SEO" },
  { value: "brief", label: "Brief" },
  { value: "other", label: "Other" },
];

export function kindLabel(kind: DeliverableKind): string {
  return DELIVERABLE_KINDS.find((k) => k.value === kind)?.label ?? "Other";
}
