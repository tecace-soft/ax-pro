import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getSession } from '../services/auth';

/**
 * Hook to ensure user is authenticated and has a selected group.
 * Group ID is ONLY from URL query parameter - no session storage.
 * This allows multiple tabs/windows to work independently with different groups.
 * Redirects to login or group-management if required.
 */
export const useGroupAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const hasCheckedRef = useRef(false);
  const lastGroupIdRef = useRef<string | null>(null);

  const urlGroupId = searchParams.get('group');
  
  useEffect(() => {
    console.log('🔄 useGroupAuth: Effect running', {
      pathname: location.pathname,
      urlGroupId,
      hasChecked: hasCheckedRef.current,
      lastGroupId: lastGroupIdRef.current
    });

    // Skip if we've already checked this group ID
    if (hasCheckedRef.current && lastGroupIdRef.current === urlGroupId) {
      console.log('⏭️ useGroupAuth: Already checked this group, skipping');
      return;
    }
    
    const session = getSession();

    // Require logged in user
    if (!session) {
      console.log('🔒 useGroupAuth: No session, redirecting to login');
      navigate('/', { replace: true });
      return;
    }

    // Only redirect to group-management if:
    // 1. There's no group in the URL
    // 2. We're on a page that requires a group (admin dashboard, settings, etc.)
    // 3. We're NOT already on the group-management page
    const requiresGroup = location.pathname.startsWith('/admin') || 
                          location.pathname.startsWith('/settings') ||
                          location.pathname.startsWith('/chat');
    
    console.log('🔍 useGroupAuth: Check conditions', {
      urlGroupId,
      requiresGroup,
      pathname: location.pathname,
      isGroupManagement: location.pathname === '/group-management'
    });
    
    if (!urlGroupId && requiresGroup && location.pathname !== '/group-management') {
      console.log('⚠️ useGroupAuth: No group in URL for page that requires it, redirecting to group management');
      console.trace('Redirect trace:');
      navigate('/group-management', { replace: true });
      return;
    }
    
    if (urlGroupId) {
      console.log('✅ useGroupAuth: Valid session and group:', urlGroupId);
    }
    
    hasCheckedRef.current = true;
    lastGroupIdRef.current = urlGroupId;
  }, [navigate, urlGroupId, location.pathname]);
  
  // Only reset if the URL group actually changed (not just re-rendered)
  useEffect(() => {
    if (lastGroupIdRef.current !== urlGroupId) {
      hasCheckedRef.current = false;
    }
  }, [urlGroupId]);

  const session = getSession();
  return {
    session,
    groupId: urlGroupId // ONLY use URL parameter
  };
};

