import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSession } from '../services/auth';
import { getUserRoleForGroup } from '../services/auth';

/**
 * Hook to get the current user's role for the active group
 * @returns Object with role, loading state, and error
 */
export const useGroupRole = () => {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastGroupIdRef = useRef<string | null>(null);

  const groupId = searchParams.get('group');
  
  useEffect(() => {
    const checkRole = async () => {
      // Prevent duplicate calls for the same groupId
      const session = getSession();
      if (!session) {
        setRole(null);
        setLoading(false);
        return;
      }

      const currentGroupId = groupId || (session as any)?.selectedGroupId;
      if (currentGroupId === lastGroupIdRef.current) {
        return;
      }
      lastGroupIdRef.current = currentGroupId;
      
      if (!currentGroupId) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const groupRole = await getUserRoleForGroup(currentGroupId);
        setRole(groupRole);
      } catch (err) {
        console.error('Failed to get group role:', err);
        setError(err instanceof Error ? err.message : 'Failed to get group role');
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]); // Only depend on groupId string, not searchParams object

  return { role, loading, error };
};

