import { getSession } from '../services/auth';

/**
 * Get the current group_id from session
 */
export const getCurrentGroupId = (): string | null => {
  const session = getSession();
  return (session as any)?.selectedGroupId || null;
};

/**
 * Append group parameter to a URL path
 */
export const withGroupParam = (path: string, groupId?: string | null): string => {
  const gId = groupId || getCurrentGroupId();
  if (!gId) return path;
  
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}group=${gId}`;
};

