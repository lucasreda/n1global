/**
 * Extract clean email address from various formats
 * Handles: "Name <email@example.com>", "email@example.com", etc.
 */
export function extractEmailAddress(emailString: string): string {
  if (!emailString) return '';
  
  // Try to extract email from "Name <email@example.com>" format
  const match = emailString.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  
  // If no angle brackets, assume it's already a clean email
  return emailString.trim().toLowerCase();
}
