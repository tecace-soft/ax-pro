import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupAuth } from '../hooks/useGroupAuth';
import { withGroupParam } from '../utils/navigation';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
import { useUICustomization } from '../hooks/useUICustomization';
import { getGroupById, updateGroupName, getUsersByIds, updateGroupUsers, searchUsers, updateUserGroups, defaultSupabase, User, Group } from '../services/groupService';
import { getSession, getUserRoleForGroup } from '../services/auth';
import { useSearchParams } from 'react-router-dom';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  useGroupAuth(); // Require auth and group (also syncs URL)
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ui' | 'group'>('ui');
  const [searchParams] = useSearchParams();
  const { customization, updateCustomization, updateQuestion } = useUICustomization();
  
  // Local state for inputs to prevent saving on every keystroke
  const [localChatTitle, setLocalChatTitle] = useState(customization.chatTitle);
  const [localChatSubtitle, setLocalChatSubtitle] = useState(customization.chatSubtitle);
  const [localQuestions, setLocalQuestions] = useState(customization.suggestedQuestions);
  
  // Sync local state when customization changes (e.g., from database load)
  useEffect(() => {
    setLocalChatTitle(customization.chatTitle);
    setLocalChatSubtitle(customization.chatSubtitle);
    setLocalQuestions(customization.suggestedQuestions);
  }, [customization.chatTitle, customization.chatSubtitle, customization.suggestedQuestions]);

  // Check URL parameters for tab navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'ui' || tab === 'photo') {
      setActiveTab('ui');
    }
  }, []);


  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageZoom, setImageZoom] = useState(100);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState('');

  // Group Settings state
  const [group, setGroup] = useState<Group | null>(null);
  const [groupUsers, setGroupUsers] = useState<User[]>([]);
  const [administrator, setAdministrator] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'user' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [localGroupName, setLocalGroupName] = useState('');
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Custom modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [userToRemove, setUserToRemove] = useState<User | null>(null);


  // Load group data when group tab is active or groupId changes
  useEffect(() => {
    const groupId = searchParams.get('group') || (getSession() as any)?.selectedGroupId;
    if (groupId && (activeTab === 'group' || !group)) {
      loadGroupData(groupId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchParams.get('group')]);

  const loadGroupData = async (groupId: string) => {
    setIsLoadingGroup(true);
    try {
      const groupData = await getGroupById(groupId);
      if (groupData) {
        setGroup(groupData);
        setLocalGroupName(groupData.name);
        
        // Get current user ID from session
        const session = getSession();
        setCurrentUserId(session?.userId || null);
        
        // Load current user's role in this group
        try {
          const userRole = await getUserRoleForGroup(groupId);
          setCurrentUserRole(userRole);
        } catch (error) {
          console.error('Failed to get user role:', error);
          setCurrentUserRole(null);
        }
        
        // Load administrator details
        if (groupData.administrator) {
          const adminUsers = await getUsersByIds([groupData.administrator]);
          setAdministrator(adminUsers[0] || null);
        } else {
          setAdministrator(null);
        }
        
        // Load user details for all user_ids in the group
        if (groupData.users && groupData.users.length > 0) {
          const users = await getUsersByIds(groupData.users);
          setGroupUsers(users);
        } else {
          setGroupUsers([]);
        }
      }
    } catch (error) {
      console.error('Failed to load group data:', error);
    } finally {
      setIsLoadingGroup(false);
    }
  };

  const showSuccessModal = (message: string) => {
    setModalMessage(message);
    setModalType('success');
    setShowModal(true);
    setTimeout(() => setShowModal(false), 2000);
  };

  const showErrorModal = (message: string) => {
    setModalMessage(message);
    setModalType('error');
    setShowModal(true);
    setTimeout(() => setShowModal(false), 3000);
  };

  const handleUpdateGroupName = async () => {
    if (!group || !localGroupName.trim()) return;
    
    try {
      await updateGroupName(group.group_id, localGroupName.trim());
      setGroup({ ...group, name: localGroupName.trim() });
      showSuccessModal(language === 'ko' ? '그룹 이름이 성공적으로 업데이트되었습니다' : 'Group name updated successfully');
    } catch (error) {
      console.error('Failed to update group name:', error);
      showErrorModal(language === 'ko' ? '그룹 이름 업데이트에 실패했습니다' : 'Failed to update group name');
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      // Filter out users already in the group
      const groupUserIds = group?.users || [];
      const filteredResults = results.filter(user => !groupUserIds.includes(user.user_id));
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Failed to search users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUser = async (userId: string) => {
    if (!group) return;
    
    try {
      const updatedUsers = [...(group.users || []), userId];
      await updateGroupUsers(group.group_id, updatedUsers);
      
      // Update user's groups array
      await updateUserGroups([userId], group.group_id);
      
      // Reload group data
      await loadGroupData(group.group_id);
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
      
      showSuccessModal(language === 'ko' ? '사용자가 그룹에 성공적으로 추가되었습니다' : 'User added to group successfully');
    } catch (error) {
      console.error('Failed to add user:', error);
      showErrorModal(language === 'ko' ? '사용자 추가에 실패했습니다' : 'Failed to add user to group');
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (!group) return;
    
    const user = groupUsers.find(u => u.user_id === userId);
    const userName = user ? `${user.first_name} ${user.last_name}` : 'this user';
    
    setConfirmTitle(language === 'ko' ? '사용자 제거 확인' : 'Confirm User Removal');
    setConfirmMessage(
      language === 'ko' 
        ? `${userName}님을 그룹에서 제거하시겠습니까?`
        : `Are you sure you want to remove ${userName} from the group?`
    );
    setUserToRemove(user);
    setConfirmAction(() => async () => {
      try {
        const updatedUsers = (group.users || []).filter(id => id !== userId);
        await updateGroupUsers(group.group_id, updatedUsers);
        
        // Remove group_id from user's groups array
        const { data: userData } = await defaultSupabase
          .from('user')
          .select('groups')
          .eq('user_id', userId)
          .single();
        
        if (userData) {
          const updatedUserGroups = (userData.groups || []).filter((g: string) => g !== group.group_id);
          await defaultSupabase
            .from('user')
            .update({ groups: updatedUserGroups })
            .eq('user_id', userId);
        }
        
        // Reload group data
        await loadGroupData(group.group_id);
        
        showSuccessModal(language === 'ko' ? '사용자가 그룹에서 성공적으로 제거되었습니다' : 'User removed from group successfully');
      } catch (error) {
        console.error('Failed to remove user:', error);
        showErrorModal(language === 'ko' ? '사용자 제거에 실패했습니다' : 'Failed to remove user from group');
      } finally {
        setShowConfirmModal(false);
        setUserToRemove(null);
        setConfirmAction(null);
      }
    });
    setShowConfirmModal(true);
  };

  const handleLeaveGroup = () => {
    if (!group || !currentUserId) return;
    
    const currentUser = groupUsers.find(u => u.user_id === currentUserId);
    if (!currentUser) return;
    
    setConfirmTitle(language === 'ko' ? '그룹 탈퇴 확인' : 'Confirm Leave Group');
    setConfirmMessage(
      language === 'ko'
        ? '정말로 이 그룹을 탈퇴하시겠습니까? 탈퇴 후에는 그룹에 다시 초대받아야 합니다.'
        : 'Are you sure you want to leave this group? You will need to be invited again to rejoin.'
    );
    setUserToRemove(currentUser);
    setConfirmAction(() => async () => {
      if (!group || !currentUserId) return;
      
      try {
        // Remove current user from group.users array
        const updatedUsers = (group.users || []).filter(id => id !== currentUserId);
        await updateGroupUsers(group.group_id, updatedUsers);
        
        // Remove group from current user's groups array
        const { data: userData } = await defaultSupabase
          .from('user')
          .select('groups')
          .eq('user_id', currentUserId)
          .single();
        
        if (userData) {
          const updatedUserGroups = (userData.groups || []).filter((g: string) => g !== group.group_id);
          await defaultSupabase
            .from('user')
            .update({ groups: updatedUserGroups })
            .eq('user_id', currentUserId);
        }
        
        showSuccessModal(language === 'ko' ? '그룹에서 탈퇴했습니다' : 'Successfully left the group');
        
        // Navigate back to group management after leaving
        setTimeout(() => {
          navigate('/group-management');
        }, 2000);
      } catch (error) {
        console.error('Failed to leave group:', error);
        showErrorModal(language === 'ko' ? '그룹 탈퇴에 실패했습니다' : 'Failed to leave group');
      } finally {
        setShowConfirmModal(false);
        setUserToRemove(null);
        setConfirmAction(null);
      }
    });
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };


  return (
    <div style={{ backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--border)', flexShrink: 0 }}>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(withGroupParam('/chat'))}
            className="text-sm px-3 py-1 rounded border transition-colors hover:bg-gray-100"
            style={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-sm px-3 py-1 rounded border transition-colors hover:bg-gray-100"
            style={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }}>
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </button>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Settings
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-sm px-3 py-1 rounded border transition-colors hover:bg-gray-100"
            style={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            {theme === 'light' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
          
          {/* Language Toggle */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            className="text-sm px-3 py-1 rounded border"
            style={{ 
              borderColor: 'var(--border)',
              color: 'var(--text)',
              backgroundColor: 'var(--card)'
            }}
          >
            <option value="en">EN</option>
            <option value="ko">KO</option>
          </select>
        </div>
      </div>

      <div className="max-w-4xl mx-auto" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', maxWidth: '56rem' }}>
        {/* Tab Navigation - Fixed at top */}
        <div className="border-b px-6 pt-6" style={{ borderColor: 'var(--border)', flexShrink: 0 }}>
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('ui')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ui'
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                color: activeTab === 'ui' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'ui' ? 'var(--primary)' : 'transparent'
              }}
            >
              {language === 'ko' ? 'UI 커스터마이징' : 'UI Customization'}
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'group'
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                color: activeTab === 'group' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'group' ? 'var(--primary)' : 'transparent'
              }}
            >
              {language === 'ko' ? '그룹 설정' : 'Group Settings'}
            </button>
          </nav>
        </div>
        
        {/* Scrollable Content Area */}
        <div 
          className="settings-content-scrollable" 
              style={{ 
            flex: 1, 
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: '1.5rem'
          }}
        >
          {/* Group Settings Tab */}
        {activeTab === 'group' && (
          <div className="space-y-6" style={{ width: '100%' }}>
            {isLoadingGroup ? (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                Loading group data...
        </div>
            ) : !group ? (
              <div className="card p-6 rounded-lg" style={{ width: '100%' }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  No group selected. Please select a group first.
                </p>
              </div>
            ) : (
              <>
                {/* Group Name */}
                <div className="card p-6 rounded-lg" style={{ width: '100%' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '그룹 이름' : 'Group Name'}
            </h2>
                  <div className="flex gap-3">
                  <input
                    type="text"
                      value={localGroupName}
                      onChange={(e) => setLocalGroupName(e.target.value)}
                      className="input flex-1 px-3 py-2 rounded-md"
                      placeholder={language === 'ko' ? '그룹 이름을 입력하세요' : 'Enter group name'}
                    />
                    <button
                      onClick={handleUpdateGroupName}
                      className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                      style={{ 
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#059669';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#10b981';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {language === 'ko' ? '저장' : 'Save'}
                    </button>
                </div>
                </div>
                
                {/* Group Administrator */}
                <div className="card p-6 rounded-lg" style={{ width: '100%' }}>
                  <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '그룹 관리자' : 'Group Administrator'}
                  </h2>
                  {administrator ? (
                    <div className="flex items-center space-x-3 p-3 rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)'
                    }}>
                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ 
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff'
                      }}>
                        <span className="text-sm font-semibold">
                          {administrator.first_name?.[0] || ''}{administrator.last_name?.[0] || ''}
                        </span>
                </div>
                      <div className="flex-1">
                        <p className="font-medium" style={{ color: 'var(--text)' }}>
                          {administrator.first_name} {administrator.last_name}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {administrator.email}
                        </p>
                </div>
                      <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ 
                        backgroundColor: 'rgba(59, 230, 255, 0.1)',
                        color: 'var(--primary)'
                      }}>
                        {language === 'ko' ? '관리자' : 'Administrator'}
                </div>
                </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {language === 'ko' ? '관리자 정보를 불러올 수 없습니다' : 'Unable to load administrator information'}
                    </p>
                  )}
              </div>
              
                {/* Group Users */}
                <div className="card p-6 rounded-lg" style={{ width: '100%' }}>
                  <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '그룹 사용자' : 'Group Users'}
            </h2>
                  
                  {/* Current Users List */}
                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-3" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '현재 사용자' : 'Current Users'} ({groupUsers.length})
                    </h3>
                    {groupUsers.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {language === 'ko' ? '그룹에 사용자가 없습니다' : 'No users in this group'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {groupUsers.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                  style={{
                              borderColor: 'var(--border)',
                              backgroundColor: 'var(--card)'
                            }}
                          >
                            <div>
                              <p className="font-medium" style={{ color: 'var(--text)' }}>
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {user.email}
                      </p>
                    </div>
                        {user.user_id === currentUserId ? (
                          // Show "Leave Group" button for current user
                          <button
                            onClick={handleLeaveGroup}
                            className="px-3 py-1 rounded-md text-sm transition-colors"
                            style={{ 
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            {language === 'ko' ? '그룹 탈퇴' : 'Leave Group'}
                          </button>
                        ) : currentUserRole === 'admin' ? (
                          // Show "Remove" button for other users (admin only)
                          <button
                            onClick={() => handleRemoveUser(user.user_id)}
                            className="px-3 py-1 rounded-md text-sm transition-colors"
                            style={{ 
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            {language === 'ko' ? '제거' : 'Remove'}
                          </button>
                        ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

                  {/* Add Users */}
                <div>
                    <h3 className="text-md font-medium mb-3" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '사용자 초대' : 'Invite Users'}
                  </h3>
                    <div className="mb-3" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (e.target.value.trim()) {
                            handleSearchUsers();
                          } else {
                            setSearchResults([]);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && searchQuery.trim()) {
                            handleSearchUsers();
                          }
                        }}
                        className="input w-full px-3 py-2 pr-10 rounded-md"
                        placeholder={language === 'ko' ? '이름 또는 이메일로 검색...' : 'Search by name or email...'}
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: isSearching ? 'var(--primary)' : 'var(--text-muted)'
                        }}
                      >
                        {isSearching ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                            <circle cx="12" cy="12" r="10" opacity="0.25"/>
                            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                          </svg>
                        )}
                    </div>
                  </div>
                  
                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                          {language === 'ko' ? '검색 결과' : 'Search Results'}
                        </p>
                        {searchResults.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                      style={{
                              borderColor: 'var(--border)',
                              backgroundColor: 'var(--card)'
                            }}
                          >
                            <div>
                              <p className="font-medium" style={{ color: 'var(--text)' }}>
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {user.email}
                          </p>
                        </div>
                          <button
                              onClick={() => handleAddUser(user.user_id)}
                              className="px-3 py-1 rounded-md text-sm transition-colors"
                            style={{ 
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                          >
                              {language === 'ko' ? '추가' : 'Add'}
                          </button>
                    </div>
                  ))}
                </div>
              )}
                    {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
                      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                        {language === 'ko' ? '검색 결과가 없습니다' : 'No users found'}
                      </p>
                    )}
              </div>
            </div>
          </>
            )}
          </div>
        )}


        {/* UI Customization Tab */}
        {activeTab === 'ui' && (
          <div className="space-y-6" style={{ width: '100%' }}>
            <div className="card p-6 rounded-lg" style={{ width: '100%' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                {language === 'ko' ? '채팅 인터페이스 커스터마이징' : 'Chat Interface Customization'}
              </h2>
              
              <div className="space-y-6">
                {/* Chat Title */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '채팅 인터페이스 제목' : 'Chat Interface Title'}
                  </label>
                  <input
                    type="text"
                    value={localChatTitle}
                    onChange={(e) => setLocalChatTitle(e.target.value)}
                    onBlur={() => updateCustomization({ chatTitle: localChatTitle })}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder={language === 'ko' ? '예: 채팅 인터페이스, AI 어시스턴트 등' : 'e.g., Chat Interface, AI Assistant, etc.'}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {language === 'ko' ? '이 제목은 빈 채팅 화면 상단에 표시됩니다' : 'This title appears at the top of the empty chat screen'}
                  </p>
                </div>

                {/* Chat Subtitle */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '채팅 인터페이스 부제목' : 'Chat Interface Subtitle'}
                  </label>
                  <input
                    type="text"
                    value={localChatSubtitle}
                    onChange={(e) => setLocalChatSubtitle(e.target.value)}
                    onBlur={() => updateCustomization({ chatSubtitle: localChatSubtitle })}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder={language === 'ko' ? '예: 사이드바에서 대화를 선택하거나 새 채팅을 시작하세요' : 'e.g., Select a conversation from the sidebar or start a new chat'}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {language === 'ko' ? '이 부제목은 빈 채팅 화면의 제목 아래에 표시됩니다' : 'This subtitle appears below the title on the empty chat screen'}
                  </p>
                </div>

                {/* Avatar Photo */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '챗봇 아바타' : 'Chatbot Avatar'}
                  </label>
                  
                  {/* Avatar Preview */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-shrink-0" style={{ width: '80px', height: '80px' }}>
                      <img 
                        src={customization.avatarUrl || '/default-profile-avatar.png'} 
                        alt="Avatar Preview" 
                        style={{ 
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          border: '2px solid var(--border)',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                        onError={(e) => {
                          e.currentTarget.src = '/default-profile-avatar.png';
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Upload and Action Buttons */}
                  <div className="flex gap-2 mb-2">
                    <label 
                      className="px-4 py-2 rounded-md cursor-pointer transition-all hover:opacity-90"
                      style={{ 
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.5)'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                      {language === 'ko' ? '사진 업로드' : 'Upload Photo'}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const result = reader.result as string;
                              setUploadedAvatarUrl(result);
                              setTempImageUrl(result);
                              setImagePosition({ x: 50, y: 50 });
                              setImageZoom(100);
                              setShowImageEditor(true);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {customization.avatarUrl && customization.avatarUrl !== '/default-profile-avatar.png' && !customization.avatarUrl.startsWith('data:') && (
                        <button 
                          onClick={() => {
                            // Save current avatar as a preset
                            const link = document.createElement('a');
                            link.href = customization.avatarUrl;
                            link.download = 'chatbot-avatar.png';
                            link.click();
                          }}
                          className="px-4 py-2 rounded-md transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            border: '1px solid rgba(16, 185, 129, 0.5)'
                          }}
                        >
                          {language === 'ko' ? '다운로드' : 'Download'}
                        </button>
                    )}
                    {customization.avatarUrl && (
                        <button 
                        onClick={() => updateCustomization({ avatarUrl: '' })}
                          className="px-4 py-2 rounded-md transition-all hover:opacity-90"
                          style={{ 
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: '1px solid rgba(239, 68, 68, 0.5)'
                          }}
                        >
                        {language === 'ko' ? '아바타 제거' : 'Remove Avatar'}
                        </button>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {language === 'ko' 
                      ? '새 이미지를 업로드하여 챗봇 아바타를 설정하세요. 이미지를 업로드하면 자동으로 저장됩니다.' 
                      : 'Upload a new image to set your chatbot avatar. The image will be saved automatically when uploaded.'}
                  </p>
                </div>

                {/* Suggested Questions */}
                <div>
                  <h3 className="text-md font-medium mb-4" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '추천 질문' : 'Suggested Questions'}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {language === 'ko' ? '빈 채팅 화면에 표시될 추천 질문을 커스터마이징하세요' : 'Customize the suggested questions that appear on the empty chat screen'}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {language === 'ko' ? '질문 1' : 'Question 1'}
                      </label>
                      <input
                        type="text"
                        value={localQuestions.question1}
                        onChange={(e) => setLocalQuestions({ ...localQuestions, question1: e.target.value })}
                        onBlur={() => updateQuestion('question1', localQuestions.question1)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder={language === 'ko' ? '인공지능이란 무엇인가요?' : 'What is artificial intelligence?'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {language === 'ko' ? '질문 2' : 'Question 2'}
                      </label>
                      <input
                        type="text"
                        value={localQuestions.question2}
                        onChange={(e) => setLocalQuestions({ ...localQuestions, question2: e.target.value })}
                        onBlur={() => updateQuestion('question2', localQuestions.question2)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder={language === 'ko' ? '머신러닝은 어떻게 작동하나요?' : 'How does machine learning work?'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {language === 'ko' ? '질문 3' : 'Question 3'}
                      </label>
                      <input
                        type="text"
                        value={localQuestions.question3}
                        onChange={(e) => setLocalQuestions({ ...localQuestions, question3: e.target.value })}
                        onBlur={() => updateQuestion('question3', localQuestions.question3)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder={language === 'ko' ? '양자 컴퓨팅을 설명해주세요' : 'Explain quantum computing'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {language === 'ko' ? '질문 4' : 'Question 4'}
                      </label>
                      <input
                        type="text"
                        value={localQuestions.question4}
                        onChange={(e) => setLocalQuestions({ ...localQuestions, question4: e.target.value })}
                        onBlur={() => updateQuestion('question4', localQuestions.question4)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder={language === 'ko' ? '클라우드 컴퓨팅의 장점은 무엇인가요?' : 'What are the benefits of cloud computing?'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="card p-6 rounded-lg" style={{ width: '100%' }}>
              <h3 className="text-md font-medium mb-4" style={{ color: 'var(--text)' }}>
                {language === 'ko' ? '미리보기' : 'Preview'}
              </h3>
              <div className="border rounded-lg p-6" style={{ 
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg)'
              }}>
                <div className="text-center">
                  <h1 className="text-4xl font-light mb-4" style={{ color: 'var(--text)' }}>
                    {localChatTitle}
                  </h1>
                  <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
                    {localChatSubtitle}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <circle cx="12" cy="5" r="2"/>
                            <path d="M12 7v4"/>
                          </svg>
                        </div>
                        <span className="text-sm">{localQuestions.question1}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                          </svg>
                        </div>
                        <span className="text-sm">{localQuestions.question2}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M8 12h8"/>
                            <path d="M12 8v8"/>
                          </svg>
                        </div>
                        <span className="text-sm">{localQuestions.question3}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                          </svg>
                        </div>
                        <span className="text-sm">{localQuestions.question4}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
              </div>
      </div>

      {/* Image Editor Modal */}
      {showImageEditor && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowImageEditor(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--card, #1e1e1e)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              border: '1px solid var(--border)'
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#ffffff' }}>
              {language === 'ko' ? '이미지 조정' : 'Adjust Image'}
            </h3>

            {/* Preview */}
            <div 
              style={{
                width: '200px',
                height: '200px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                border: '2px solid var(--border)',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${tempImageUrl})`,
                  backgroundSize: `${imageZoom}%`,
                  backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  backgroundRepeat: 'no-repeat'
                }}
              />
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Zoom Control */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                  {language === 'ko' ? '확대/축소' : 'Zoom'}: {imageZoom}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={imageZoom}
                  onChange={(e) => setImageZoom(Number(e.target.value))}
                  className="w-full"
                  style={{
                    accentColor: 'var(--primary)'
                  }}
                />
              </div>

              {/* Horizontal Position */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                  {language === 'ko' ? '가로 위치' : 'Horizontal Position'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imagePosition.x}
                  onChange={(e) => setImagePosition({ ...imagePosition, x: Number(e.target.value) })}
                  className="w-full"
                  style={{
                    accentColor: 'var(--primary)'
                  }}
                />
              </div>

              {/* Vertical Position */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                  {language === 'ko' ? '세로 위치' : 'Vertical Position'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imagePosition.y}
                  onChange={(e) => setImagePosition({ ...imagePosition, y: Number(e.target.value) })}
                  className="w-full"
                  style={{
                    accentColor: 'var(--primary)'
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-6">
              <button
                onClick={() => {
                  // Use original uploaded image
                  updateCustomization({ avatarUrl: uploadedAvatarUrl });
                  setShowImageEditor(false);
                }}
                className="w-full px-4 py-2 rounded-md font-medium transition-colors hover:opacity-90"
                style={{ 
                  backgroundColor: '#3b82f6',
                  color: '#ffffff'
                }}
              >
                {language === 'ko' ? '원본 사용' : 'Use Original'}
              </button>
              
              <button
                onClick={() => {
                  // Create cropped version matching preview
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const img = new Image();
                  
                  img.onload = () => {
                    const size = 300; // Output size
                    canvas.width = size;
                    canvas.height = size;
                    
                    if (ctx) {
                      // Calculate the crop area from original image
                      const scale = imageZoom / 100;
                      
                      // Determine which dimension to fit
                      let sourceSize = Math.min(img.width, img.height);
                      
                      // Calculate the actual visible area in the original image
                      const visibleWidth = sourceSize / scale;
                      const visibleHeight = sourceSize / scale;
                      
                      // Calculate crop position in original image coordinates
                      const cropX = (imagePosition.x / 100) * (img.width - visibleWidth);
                      const cropY = (imagePosition.y / 100) * (img.height - visibleHeight);
                      
                      // Draw the cropped portion
                      ctx.drawImage(
                        img,
                        cropX, cropY, visibleWidth, visibleHeight, // Source rectangle
                        0, 0, size, size // Destination rectangle
                      );
                      
                      updateCustomization({ avatarUrl: canvas.toDataURL('image/png', 0.95) });
                    }
                    
                    setShowImageEditor(false);
                  };
                  
                  img.src = uploadedAvatarUrl;
                }}
                className="w-full px-4 py-2 rounded-md font-medium transition-colors hover:opacity-90"
                style={{ 
                  backgroundColor: '#10b981',
                  color: '#ffffff'
                }}
              >
                {language === 'ko' ? '조정된 이미지 사용' : 'Use Adjusted'}
              </button>
              
              <button
                onClick={() => setShowImageEditor(false)}
                className="w-full px-4 py-2 rounded-md font-medium transition-colors hover:bg-gray-700"
                style={{ 
                  backgroundColor: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)'
                }}
              >
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Success/Error Modal */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '300px',
              maxWidth: '500px',
              border: `2px solid ${modalType === 'success' ? '#10b981' : '#ef4444'}`,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center space-x-3 mb-4">
              {modalType === 'success' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
              <h3 
                className="text-lg font-semibold"
                style={{ 
                  color: modalType === 'success' ? '#10b981' : '#ef4444'
                }}
              >
                {modalType === 'success' 
                  ? (language === 'ko' ? '성공' : 'Success')
                  : (language === 'ko' ? '오류' : 'Error')
                }
              </h3>
            </div>
            <p style={{ color: 'var(--text)', marginBottom: '16px' }}>
              {modalMessage}
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full px-4 py-2 rounded-md font-medium transition-all"
              style={{ 
                backgroundColor: modalType === 'success' ? '#10b981' : '#ef4444',
                color: '#ffffff',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {language === 'ko' ? '확인' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={handleCancelConfirm}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '300px',
              maxWidth: '500px',
              border: '2px solid #f59e0b',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3 
                className="text-lg font-semibold"
                style={{ 
                  color: '#f59e0b'
                }}
              >
                {language === 'ko' ? '확인' : 'Confirm'}
              </h3>
            </div>
            <p style={{ color: 'var(--text)', marginBottom: '20px' }}>
              {confirmMessage}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-all"
                style={{ 
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {language === 'ko' ? '확인' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
