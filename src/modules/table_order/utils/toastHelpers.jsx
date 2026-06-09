/**
 * Infer toast variant from message text (keeps existing call sites working).
 */
export function inferToastType(text) {
  const t = String(text).toLowerCase();

  if (
    t.includes("rejected") ||
    t.includes("reject") ||
    t.includes("failed") ||
    t.includes("fail") ||
    t.includes("error") ||
    t.includes("❌") ||
    t.includes("delete employee")
  ) {
    return "error";
  }

  if (
    t.includes("accepted") ||
    t.includes("completed") ||
    t.includes("success") ||
    t.includes("✅") ||
    t.includes("restored") ||
    t.includes("started") ||
    t.includes("saved") ||
    t.includes("added successfully") ||
    t.includes("deleted successfully") ||
    t.includes("new order") ||
    t.includes("closed successfully")
  ) {
    return "success";
  }

  if (
    t.includes("⚠") ||
    t.includes("low stock") ||
    t.includes("warning") ||
    t.includes("open today")
  ) {
    return "warning";
  }

  return "info";
}

export const TOAST_ICONS = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "ℹ",
};