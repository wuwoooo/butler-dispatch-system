export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateFull(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTimeFull(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatDateFull(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function todayText() {
  return formatDateFull(new Date());
}

export function maskPhone(phone?: string | null) {
  if (!phone) return "-";
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

