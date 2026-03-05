import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types/profile';
import { profileService } from '../services/profileService';

interface ProfileContextType {
  currentProfile: UserProfile | null;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// 고정된 공통 프로필 ID - 모든 사용자가 같은 데이터를 보게 됨
const SHARED_PROFILE_ID = 'tecace-ax-pro-shared-profile';

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshProfile = async () => {
    try {
      setLoading(true);
      console.log('🔵 ProfileContext: refreshProfile called'); // 디버깅용
      
      // 임시로 기본 프로필을 직접 설정
      const defaultProfile: UserProfile = {
        id: SHARED_PROFILE_ID,
        displayName: 'AX PRO Platform',
        email: 'axpro@tecace.com',
        role: 'Main AI Assistant for HR Support',
        department: 'AI Support',
        bio: 'AI Assistant helping with HR and support tasks',
        avatarUrl: '/default-profile-avatar.png',
        performanceScore: 87, // 이 줄 추가
        status: 'ACTIVE' // 이 줄 추가
      };
      
      console.log('🔵 ProfileContext: Setting profile:', defaultProfile); // 디버깅용
      setCurrentProfile(defaultProfile);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    try {
      const defaultProfile: Partial<UserProfile> = {
        id: SHARED_PROFILE_ID,
        displayName: 'AX PRO Platform',
        email: 'axpro@tecace.com',
        role: 'Main AI Assistant for HR Support',
        department: 'AI Support',
        bio: 'AI Assistant helping with HR and support tasks',
        avatarUrl: '/default-profile-avatar.png', // 사용자 제공 이미지
        performanceScore: 87,
        status: 'ACTIVE'
      };
      
      const createdProfile = await profileService.updateProfile(SHARED_PROFILE_ID, defaultProfile);
      setCurrentProfile(createdProfile);
    } catch (error) {
      console.error('Failed to create default profile:', error);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      setLoading(true);
      // 항상 공통 프로필 ID로 업데이트
      const updatedProfile = await profileService.updateProfile(SHARED_PROFILE_ID, profileData);
      setCurrentProfile(updatedProfile);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setLoading(true);
      // 공통 프로필 ID로 아바타 업로드
      const { avatarUrl } = await profileService.uploadAvatar(SHARED_PROFILE_ID, file);
      await updateProfile({ avatarUrl });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <ProfileContext.Provider value={{
      currentProfile,
      updateProfile,
      uploadAvatar,
      refreshProfile,
      loading
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
