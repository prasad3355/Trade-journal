export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
export const formatNumber = (value) =>
  value == null || value === ""
    ? "—"
    : Number(value).toFixed(2).replace(/\.00$/, "");
export const formatSigned = (value) =>
  value == null || value === "—"
    ? "—"
    : value.startsWith("-")
      ? `−${value.slice(1)}`
      : `+${value}`;
export const formatPrice = (value) =>
  value == null || value === ""
    ? "—"
    : Number(value).toLocaleString("en-US", {
      minimumFractionDigits: value < 100 ? 5 : 2,
      maximumFractionDigits: value < 100 ? 5 : 2,
    });
export const parseDateSafely = (value) => {
  if (!value) return null;
  const parseableStr = String(value);

  // Notion exported DD/MM/YYYY support with safe time fallback
  const match = parseableStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/);
  if (match) {
    const [, d, m, y, rest] = match;
    // Strip unstable trailing timezones like '(GMT+5:30)' for cross-browser compat (Safari)
    const cleanRest = rest.replace(/\(GMT[^)]+\)/i, '').trim();
    const dateObj = new Date(`${m}/${d}/${y} ${cleanRest}`);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // Standard JS parser fallback
  const d = new Date(value.replace(/\(GMT[^)]+\)/i, '').trim());
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value) => {
  if (!value || value === "") return "—";

  const dateObj = parseDateSafely(value);
  if (!dateObj) return String(value); // Defensive string return

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(dateObj);
  } catch (e) {
    return String(value);
  }
};
