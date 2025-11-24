import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSession } from '../services/auth';

/**
 * Hook to ensure user is authenticated and has a selected group.
 * Syncs group_id between session and URL query parameter.
 * Redirects to login or group-management if required.
 */
export const useGroupAuth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const session = getSession();

    // Require logged in user
    if (!session) {
      navigate('/', { replace: true });
      return;
    }

    // Get group_id from URL query or session
    const urlGroupId = searchParams.get('group');
    const sessionGroupId = (session as any)?.selectedGroupId;

    // If URL has group but session doesn't, update session
    if (urlGroupId && urlGroupId !== sessionGroupId) {
      const updatedSession = { ...session, selectedGroupId: urlGroupId };
      try {
        localStorage.setItem('axpro_session', JSON.stringify(updatedSession));
      } catch (e) {
        console.error('Failed to update session with group_id:', e);
      }
    }

    // If session has group but URL doesn't, update URL
    if (sessionGroupId && !urlGroupId) {
      searchParams.set('group', sessionGroupId);
      setSearchParams(searchParams, { replace: true });
    }

    // If neither has group_id, redirect to group management
    if (!sessionGroupId && !urlGroupId) {
      navigate('/group-management', { replace: true });
      return;
    }
  }, [navigate, searchParams, setSearchParams]);

  const session = getSession();
  return {
    session,
    groupId: (session as any)?.selectedGroupId || searchParams.get('group') || null
  };
};

