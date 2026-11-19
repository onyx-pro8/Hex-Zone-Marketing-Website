import type { AuthUser } from "./api/auth";

/** System-admin tier. Family is PRIVATE_PLUS and is not included. */
export function isPrivateAccount(
  user: Pick<AuthUser, "accountType" | "account_type"> | null | undefined,
): boolean {
  return (
    String(user?.accountType ?? user?.account_type ?? "")
      .trim()
      .toUpperCase() === "PRIVATE"
  );
}

export function accountTypeLabel(type?: string | null): string {
  const normalized = normalizeAccountType(type);
  if (normalized === "EXCLUSIVE") return "Individual";
  if (normalized === "ENHANCED") return "Individual Pro";
  if (normalized === "PRIVATE_PLUS") return "Family";
  if (normalized === "ENHANCED_PLUS") return "Organization";
  if (normalized === "PRIVATE") return "Private";
  return type?.trim() || "—";
}

export const ASSIGNABLE_ACCOUNT_TYPES: {
  value: string;
  apiValue: string;
  label: string;
}[] = [
  { value: "PRIVATE", apiValue: "private", label: "Private (System Admin)" },
  { value: "PRIVATE_PLUS", apiValue: "private_plus", label: "Family" },
  { value: "EXCLUSIVE", apiValue: "exclusive", label: "Individual" },
  { value: "ENHANCED", apiValue: "enhanced", label: "Individual Pro" },
  { value: "ENHANCED_PLUS", apiValue: "enhanced_plus", label: "Organization" },
];

export function normalizeAccountType(value?: string | null): string {
  const upper = String(value ?? "")
    .trim()
    .toUpperCase();
  if (upper === "EXCLUSIVE") return "EXCLUSIVE";
  if (upper === "PRIVATE_PLUS" || upper === "PRIVATE+" || upper === "PRIVATEPLUS") {
    return "PRIVATE_PLUS";
  }
  if (upper === "ENHANCED") return "ENHANCED";
  if (
    upper === "ENHANCED_PLUS" ||
    upper === "ENHANCED+" ||
    upper === "ENHANCEDPLUS" ||
    upper === "ENHANCE_PLUS" ||
    upper === "ENHANCE+"
  ) {
    return "ENHANCED_PLUS";
  }
  if (upper === "PRIVATE") return "PRIVATE";
  return upper;
}

export function toApiAccountType(type: string): string {
  const match = ASSIGNABLE_ACCOUNT_TYPES.find((option) => option.value === type);
  return match?.apiValue ?? type.toLowerCase();
}
