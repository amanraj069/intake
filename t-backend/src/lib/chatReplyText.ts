/**
 * The chat renders replies as plain text, and the prompt asks for plain text,
 * but models still slip into Markdown. The common marks are stripped here
 * rather than shown to the user as literal asterisks and hashes.
 */
export function toPlainChatText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[*•]\s+/gm, '- ')
    .replace(/\u2014/g, ' - ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
