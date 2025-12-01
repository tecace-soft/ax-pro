import { useEffect, useRef } from 'react';
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
  const hasSyncedRef = useRef(false);

  const urlGroupId = searchParams.get('group');
  
  useEffect(() => {
    // Prevent infinite loops by only syncing once per group change
    if (hasSyncedRef.current) {
      return;
    }
    
    const session = getSession();

    // Require logged in user
    if (!session) {
      navigate('/', { replace: true });
      return;
    }

    const sessionGroupId = (session as any)?.selectedGroupId;

    // If URL has group but session doesn't, update session
    if (urlGroupId && urlGroupId !== sessionGroupId) {
      const updatedSession = { ...session, selectedGroupId: urlGroupId };
      try {
        localStorage.setItem('axpro_session', JSON.stringify(updatedSession));
        hasSyncedRef.current = true;
      } catch (e) {
        console.error('Failed to update session with group_id:', e);
      }
      return;
    }

    // If session has group but URL doesn't, update URL
    if (sessionGroupId && !urlGroupId) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('group', sessionGroupId);
      setSearchParams(newSearchParams, { replace: true });
      hasSyncedRef.current = true;
      return;
    }

    // If neither has group_id, redirect to group management
    if (!sessionGroupId && !urlGroupId) {
      navigate('/group-management', { replace: true });
      return;
    }
    
    hasSyncedRef.current = true;
  }, [navigate, urlGroupId, searchParams, setSearchParams]);
  
  // Reset sync flag when groupId changes
  useEffect(() => {
    hasSyncedRef.current = false;
  }, [urlGroupId]);

  const session = getSession();
  return {
    session,
    groupId: (session as any)?.selectedGroupId || searchParams.get('group') || null
  };
};

