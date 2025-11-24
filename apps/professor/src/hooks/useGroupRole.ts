import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const checkRole = async () => {
      setLoading(true);
      setError(null);

      const session = getSession();
      if (!session) {
        setRole(null);
        setLoading(false);
        return;
      }

      const groupId = searchParams.get('group') || (session as any)?.selectedGroupId;
      if (!groupId) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const groupRole = await getUserRoleForGroup(groupId);
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
  }, [searchParams]);

  return { role, loading, error };
};

