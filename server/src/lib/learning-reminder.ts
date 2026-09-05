export function zonedReminderClock(now: Date, timezone: string): {
  dateKey: string;
  time: string;
  displayTime: string;
} {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const hour = value("hour");
  const minute = value("minute");
  return {
    dateKey: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    displayTime: `${year}年${Number(month)}月${Number(day)}日 ${hour}:${minute}`,
  };
}
