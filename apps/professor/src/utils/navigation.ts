import { getSession } from '../services/auth';

/**
 * Get the current group_id from URL ONLY (not from session)
 * This allows multiple tabs/windows to work independently with different groups
 */
export const getCurrentGroupId = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('group');
};

/**
 * Get group_id from URL query parameter
 * Used by services that need group context
 */
export const getGroupIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('group');
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

