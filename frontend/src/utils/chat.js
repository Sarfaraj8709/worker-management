// Lightweight helpers shared by chat UI components

export const chatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const chatDayLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Splits a chronological message list into day-bucketed render groups
export const groupByDay = (messages) => {
  const groups = [];
  for (const msg of messages) {
    const label = chatDayLabel(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(msg);
    else groups.push({ label, items: [msg] });
  }
  return groups;
};
