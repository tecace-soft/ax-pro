import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, logout } from '../services/auth';
import { defaultSupabase } from '../services/groupService';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';

interface Group {
  group_id: string;
  name: string;
  administrator: string;
  users: string[];
  created_at?: string;
  creatorName?: string; // Full name of the administrator/creator
}

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  's-admin'?: boolean;
  groups?: string[];
  created_at?: string;
}

const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { language, t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'groups' | 'users'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ type: 'group' | 'user'; id: string; name: string } | null>(null);
  const [groupsToDelete, setGroupsToDelete] = useState<string[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session || !session.isSuperAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all groups
      const { data: groupsData, error: groupsError } = await defaultSupabase
        .from('group')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) {
        console.error('Error loading groups:', groupsError);
        setGroups([]);
      } else {
        // Load creator names for each group
        const groupsWithCreators = await Promise.all(
          (groupsData || []).map(async (group) => {
            if (group.administrator) {
              try {
                const { data: creatorData, error: creatorError } = await defaultSupabase
                  .from('user')
                  .select('first_name, last_name')
                  .eq('user_id', group.administrator)
                  .single();

                if (!creatorError && creatorData) {
                  return {
                    ...group,
                    creatorName: `${creatorData.first_name} ${creatorData.last_name}`
                  };
                }
              } catch (error) {
                console.error(`Error loading creator for group ${group.group_id}:`, error);
              }
            }
            return {
              ...group,
              creatorName: group.administrator || '-'
            };
          })
        );
        setGroups(groupsWithCreators);
      }

      // Load all users
      const { data: usersData, error: usersError } = await defaultSupabase
        .from('user')
        .select('user_id, first_name, last_name, email, s-admin, groups, created_at')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        setUsers([]);
      } else {
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteGroup = (group: Group) => {
    setItemToDelete({ type: 'group', id: group.group_id, name: group.name });
    setConfirmTitle(language === 'ko' ? '그룹 삭제 확인' : 'Confirm Delete Group');
    setConfirmMessage(
      language === 'ko'
        ? `'${group.name}' 그룹을 삭제하시겠습니까? 이 작업은 영구적이며 되돌릴 수 없습니다. 그룹의 모든 사용자에서 이 그룹이 제거됩니다.`
        : `Are you sure you want to delete the group '${group.name}'? This action is permanent and cannot be undone. All users in this group will have this group removed from their groups list.`
    );
    setConfirmAction(() => async () => {
      try {
        // Remove group_id from all users' groups arrays
        if (group.users && group.users.length > 0) {
          for (const userId of group.users) {
            try {
              const { data: userData, error: userError } = await defaultSupabase
                .from('user')
                .select('groups')
                .eq('user_id', userId)
                .single();

              if (!userError && userData && userData.groups) {
                const updatedGroups = (userData.groups as string[]).filter((g: string) => g !== group.group_id);
                await defaultSupabase
                  .from('user')
                  .update({ groups: updatedGroups })
                  .eq('user_id', userId);
              }
            } catch (error) {
              console.error(`Error updating user ${userId}:`, error);
            }
          }
        }

        // Delete the group
        const { error: deleteError } = await defaultSupabase
          .from('group')
          .delete()
          .eq('group_id', group.group_id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        // Reload data
        await loadData();
        setShowConfirmModal(false);
        setItemToDelete(null);
        setConfirmAction(null);
      } catch (error) {
        console.error('Failed to delete group:', error);
        alert(language === 'ko' ? '그룹 삭제에 실패했습니다' : 'Failed to delete group');
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteUser = (user: User) => {
    // Find all groups created by this user
    const groupsCreatedByUser = groups.filter(g => g.administrator === user.user_id);
    const groupsCreatedCount = groupsCreatedByUser.length;
    const groupNames = groupsCreatedByUser.map(g => g.name);

    setItemToDelete({ type: 'user', id: user.user_id, name: `${user.first_name} ${user.last_name}` });
    setGroupsToDelete(groupNames);
    setConfirmTitle(language === 'ko' ? '사용자 삭제 확인' : 'Confirm Delete User');
    setConfirmMessage(
      language === 'ko'
        ? `'${user.first_name} ${user.last_name}' 사용자를 삭제하시겠습니까? 이 작업은 영구적이며 되돌릴 수 없습니다. 이 사용자는 모든 그룹에서 제거되며, 이 사용자가 생성한 ${groupsCreatedCount}개의 그룹도 함께 삭제됩니다.`
        : `Are you sure you want to delete the user '${user.first_name} ${user.last_name}'? This action is permanent and cannot be undone. This user will be removed from all groups, and ${groupsCreatedCount} group(s) created by this user will also be deleted.`
    );
    setConfirmAction(() => async () => {
      try {
        // First, delete all groups created by this user
        if (groupsCreatedByUser.length > 0) {
          for (const group of groupsCreatedByUser) {
            // Remove group_id from all users' groups arrays for each group
            if (group.users && group.users.length > 0) {
              for (const userId of group.users) {
                try {
                  const { data: userData, error: userError } = await defaultSupabase
                    .from('user')
                    .select('groups')
                    .eq('user_id', userId)
                    .single();

                  if (!userError && userData && userData.groups) {
                    const updatedGroups = (userData.groups as string[]).filter((g: string) => g !== group.group_id);
                    await defaultSupabase
                      .from('user')
                      .update({ groups: updatedGroups })
                      .eq('user_id', userId);
                  }
                } catch (error) {
                  console.error(`Error updating user ${userId} for group deletion:`, error);
                }
              }
            }

            // Delete the group
            await defaultSupabase
              .from('group')
              .delete()
              .eq('group_id', group.group_id);
          }
        }

        // Remove user_id from all groups' users arrays (for groups not created by this user)
        if (user.groups && user.groups.length > 0) {
          for (const groupId of user.groups) {
            // Skip groups that were already deleted above
            if (groupsCreatedByUser.some(g => g.group_id === groupId)) {
              continue;
            }

            try {
              const { data: groupData, error: groupError } = await defaultSupabase
                .from('group')
                .select('users')
                .eq('group_id', groupId)
                .single();

              if (!groupError && groupData && groupData.users) {
                const updatedUsers = (groupData.users as string[]).filter((u: string) => u !== user.user_id);
                await defaultSupabase
                  .from('group')
                  .update({ users: updatedUsers })
                  .eq('group_id', groupId);
              }
            } catch (error) {
              console.error(`Error updating group ${groupId}:`, error);
            }
          }
        }

        // Delete the user
        const { error: deleteError } = await defaultSupabase
          .from('user')
          .delete()
          .eq('user_id', user.user_id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        // Reload data
        await loadData();
        setShowConfirmModal(false);
        setItemToDelete(null);
        setGroupsToDelete([]);
        setConfirmAction(null);
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert(language === 'ko' ? '사용자 삭제에 실패했습니다' : 'Failed to delete user');
      }
    });
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (confirmAction) {
      await confirmAction();
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setItemToDelete(null);
    setGroupsToDelete([]);
    setConfirmAction(null);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.group_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {language === 'ko' ? '슈퍼 관리자' : 'Super Admin'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {language === 'ko' ? '모든 그룹 및 사용자 관리' : 'Manage all groups and users'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md text-sm border"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            {language === 'ko' ? '로그아웃' : 'Logout'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'groups' ? 'border-b-2' : ''
            }`}
            style={{
              color: activeTab === 'groups' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottomColor: activeTab === 'groups' ? 'var(--primary)' : 'transparent'
            }}
          >
            {language === 'ko' ? '그룹' : 'Groups'} ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users' ? 'border-b-2' : ''
            }`}
            style={{
              color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottomColor: activeTab === 'users' ? 'var(--primary)' : 'transparent'
            }}
          >
            {language === 'ko' ? '사용자' : 'Users'} ({users.length})
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={language === 'ko' ? '검색...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-md border"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="card rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '그룹 이름' : 'Group Name'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '그룹 ID' : 'Group ID'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '생성자' : 'Creator'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '사용자 수' : 'Users'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '생성일' : 'Created'}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '삭제' : 'Delete'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                        {language === 'ko' ? '그룹이 없습니다' : 'No groups found'}
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group) => (
                      <tr key={group.group_id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3" style={{ color: 'var(--text)' }}>
                          {group.name}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {group.group_id}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {group.creatorName || group.administrator || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {group.users?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {group.created_at ? new Date(group.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteGroup(group)}
                            className="p-1.5 rounded transition-colors"
                            style={{
                              color: '#ef4444',
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title={language === 'ko' ? '그룹 삭제' : 'Delete group'}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '이름' : 'Name'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '이메일' : 'Email'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '사용자 ID' : 'User ID'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '그룹 수' : 'Groups'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '생성일' : 'Created'}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {language === 'ko' ? '삭제' : 'Delete'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                        {language === 'ko' ? '사용자가 없습니다' : 'No users found'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.user_id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3" style={{ color: 'var(--text)' }}>
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {user.user_id}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {user.groups?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 rounded transition-colors"
                            style={{
                              color: '#ef4444',
                              backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title={language === 'ko' ? '사용자 삭제' : 'Delete user'}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleCancelConfirm}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border-2"
            style={{
              backgroundColor: 'var(--card, #2f2f2f)',
              borderColor: 'var(--admin-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
                {confirmTitle}
              </h3>
              <button
                onClick={handleCancelConfirm}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                ✕
              </button>
            </div>
            <div className="mb-6">
              <div className="flex items-start space-x-4 mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style={{ color: 'var(--admin-text-secondary)' }}>{confirmMessage}</p>
              </div>
              
              {/* Show list of groups to be deleted if deleting a user */}
              {itemToDelete?.type === 'user' && groupsToDelete.length > 0 && (
                <div className="mt-4 p-3 rounded-lg border" style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'rgba(239, 68, 68, 0.2)'
                }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '삭제될 그룹:' : 'Groups to be deleted:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {groupsToDelete.map((groupName, index) => (
                      <li key={index} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {groupName}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelConfirm}
                className="px-4 py-2 rounded-md font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)'
                }}
              >
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-md font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.3)'
                }}
              >
                {language === 'ko' ? '삭제' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;

