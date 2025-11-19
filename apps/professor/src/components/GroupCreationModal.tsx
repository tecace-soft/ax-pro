import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { getSession } from '../services/auth';
import { searchUsers, createGroup, updateUserGroups } from '../services/groupService';

interface User {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface GroupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

const GroupCreationModal: React.FC<GroupCreationModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const { theme } = useTheme();
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setGroupName('');
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUsers([]);
      setError(null);
    }
  }, [isOpen]);

  // Search users when search term changes
  useEffect(() => {
    const searchUsersDebounced = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const users = await searchUsers(searchTerm);
        setSearchResults(users);
      } catch (error) {
        console.error('Failed to search users:', error);
        setError('Failed to search users');
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsersDebounced, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleAddUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const generateGroupId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    const session = getSession();
    if (!session) {
      setError('You must be logged in to create a group');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const groupId = generateGroupId();
      const administratorId = session.userId;

      console.log('Creating group with data:', {
        group_id: groupId,
        name: groupName.trim(),
        administrator: administratorId,
        users: selectedUsers.map(u => u.user_id)
      });

      // Create the group
      const createdGroup = await createGroup({
        group_id: groupId,
        name: groupName.trim(),
        administrator: administratorId,
        users: selectedUsers.map(u => u.user_id)
      });

      console.log('✅ Group created in database:', createdGroup);

      // Update user groups for all selected users and admin
      const allUserIds = [administratorId, ...selectedUsers.map(u => u.user_id)];
      console.log('Updating user groups for:', allUserIds);
      await updateUserGroups(allUserIds, groupId);
      console.log('✅ User groups updated successfully');

      console.log('✅ Group created successfully:', groupId);
      
      // Close modal and notify parent with groupId
      onGroupCreated(groupId);
      onClose();
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create group';
      console.error('Error details:', {
        message: errorMessage,
        error: error
      });
      setError(`Failed to create group: ${errorMessage}. Please check the console for details.`);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: 'var(--card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Create New Group
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Group Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3 py-2 border rounded-md"
              style={{
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            />
          </div>

          {/* User Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Add Users
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by first name, last name, or email"
                className="w-full px-3 py-2 border rounded-md"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-md max-h-40 overflow-y-auto" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleAddUser(user)}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="font-medium" style={{ color: 'var(--text)' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                Selected Users ({selectedUsers.length})
              </label>
              <div className="space-y-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-3 py-2 border rounded-md"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text)' }}>
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {user.email}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text)',
              backgroundColor: 'var(--bg)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={isCreating || !groupName.trim()}
            className="btn-primary px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupCreationModal;
