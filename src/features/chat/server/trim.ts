export function trimToRecentUserTurns<T extends { role: string }>(
  messages: T[],
  max = 12,
): T[] {
  const window = messages.length > max ? messages.slice(-max) : messages.slice();
  const firstUser = window.findIndex((message) => message.role === "user");
  if (firstUser === -1) return [];
  return window.slice(firstUser);
}
