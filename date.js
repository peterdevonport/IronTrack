function toLocalDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function countActiveDays(daysBack, today, activeDates) {
  let count = 0;
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activeDates.has(toLocalDateKey(d))) count++;
  }
  return count;
}

function countConsecutiveDays(today, activeDates) {
  if (activeDates.size === 0) return 0;

  const todayStr = toLocalDateKey(today);
  let startDate;

  if (activeDates.has(todayStr)) {
    startDate = new Date(today);
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (activeDates.has(toLocalDateKey(yesterday))) {
      startDate = yesterday;
    } else {
      return 0;
    }
  }

  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() - i);
    if (activeDates.has(toLocalDateKey(d))) streak++;
    else break;
  }
  return streak;
}

export { getMonday, countActiveDays, countConsecutiveDays, toLocalDateKey };
