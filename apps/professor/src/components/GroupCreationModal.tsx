import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
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
  const { language } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI Customization fields (all optional, no defaults)
  const [chatTitle, setChatTitle] = useState('');
  const [chatSubtitle, setChatSubtitle] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState({
    question1: '',
    question2: '',
    question3: '',
    question4: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageZoom, setImageZoom] = useState(100);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setGroupName('');
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUsers([]);
      setError(null);
      // Reset UI customization to empty
      setChatTitle('');
      setChatSubtitle('');
      setSuggestedQuestions({
        question1: '',
        question2: '',
        question3: '',
        question4: '',
      });
      setAvatarUrl('');
      setShowImageEditor(false);
      setTempImageUrl('');
      setImagePosition({ x: 50, y: 50 });
      setImageZoom(100);
      setUploadedAvatarUrl('');
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

      // Create the group with UI customization
      const chatTitleValue = chatTitle.trim() || undefined;
      const chatSubtitleValue = chatSubtitle.trim() || undefined;
      const avatarUrlValue = avatarUrl.trim() || undefined;
      const questionsArray = [
        suggestedQuestions.question1.trim(),
        suggestedQuestions.question2.trim(),
        suggestedQuestions.question3.trim(),
        suggestedQuestions.question4.trim(),
      ].filter(q => q !== '');
      const suggestedQuestionsValue = questionsArray.length > 0 ? questionsArray : undefined;

      const createdGroup = await createGroup({
        group_id: groupId,
        name: groupName.trim(),
        administrator: administratorId,
        users: selectedUsers.map(u => u.user_id),
        chat_title: chatTitleValue,
        chat_subtitle: chatSubtitleValue,
        suggested_questions: suggestedQuestionsValue,
        avatar_url: avatarUrlValue,
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

          {/* UI Customization Section */}
          <div className="mb-6 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--text)' }}>
              {language === 'ko' ? '채팅 인터페이스 설정' : 'Chat Interface Settings'}
            </h3>
            
            {/* Avatar Photo Upload - First */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                {language === 'ko' ? '챗봇 아바타' : 'Chatbot Avatar'}
              </label>
              
              {/* Avatar Preview */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-shrink-0" style={{ width: '80px', height: '80px' }}>
                  <img 
                    src={avatarUrl || '/default-profile-avatar.png'} 
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
              
              {/* Upload Button */}
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
                {avatarUrl && (
                  <button 
                    onClick={() => setAvatarUrl('')}
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
                  ? '이미지를 업로드하여 챗봇 아바타를 설정하세요. 업로드 후 크기와 위치를 조정할 수 있습니다.' 
                  : 'Upload an image to set your chatbot avatar. You can adjust size and position after uploading.'}
              </p>
            </div>

            {/* Chat Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                {language === 'ko' ? '채팅 인터페이스 제목' : 'Chat Interface Title'}
              </label>
              <input
                type="text"
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
                placeholder={language === 'ko' ? '예: 채팅 인터페이스, AI 어시스턴트 등' : 'e.g., Chat Interface, AI Assistant, etc.'}
                className="w-full px-3 py-2 border rounded-md"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              />
            </div>

            {/* Chat Subtitle */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                {language === 'ko' ? '채팅 인터페이스 부제목' : 'Chat Interface Subtitle'}
              </label>
              <input
                type="text"
                value={chatSubtitle}
                onChange={(e) => setChatSubtitle(e.target.value)}
                placeholder={language === 'ko' ? '예: 사이드바에서 대화를 선택하거나 새 채팅을 시작하세요' : 'e.g., Select a conversation from the sidebar or start a new chat'}
                className="w-full px-3 py-2 border rounded-md"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              />
            </div>

            {/* Suggested Questions */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                {language === 'ko' ? '추천 질문' : 'Suggested Questions'}
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={suggestedQuestions.question1}
                  onChange={(e) => setSuggestedQuestions({ ...suggestedQuestions, question1: e.target.value })}
                  placeholder={language === 'ko' ? '질문 1' : 'Question 1'}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
                <input
                  type="text"
                  value={suggestedQuestions.question2}
                  onChange={(e) => setSuggestedQuestions({ ...suggestedQuestions, question2: e.target.value })}
                  placeholder={language === 'ko' ? '질문 2' : 'Question 2'}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
                <input
                  type="text"
                  value={suggestedQuestions.question3}
                  onChange={(e) => setSuggestedQuestions({ ...suggestedQuestions, question3: e.target.value })}
                  placeholder={language === 'ko' ? '질문 3' : 'Question 3'}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
                <input
                  type="text"
                  value={suggestedQuestions.question4}
                  onChange={(e) => setSuggestedQuestions({ ...suggestedQuestions, question4: e.target.value })}
                  placeholder={language === 'ko' ? '질문 4' : 'Question 4'}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
              </div>
            </div>
          </div>

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
                  setAvatarUrl(uploadedAvatarUrl);
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
                      
                      setAvatarUrl(canvas.toDataURL('image/png', 0.95));
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
    </div>
  );
};

export default GroupCreationModal;
