export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.length === 0) return "—";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length <= 4) return (hasPlus ? "+" : "") + "*".repeat(digits.length);
  const head = digits.slice(0, hasPlus ? 4 : 3);
  const tail = digits.slice(-2);
  const stars = "*".repeat(Math.max(3, digits.length - head.length - tail.length));
  return (hasPlus ? "+" : "") + head + stars + tail;
}

export function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return "";
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}
