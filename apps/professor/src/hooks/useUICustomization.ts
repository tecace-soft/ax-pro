import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UICustomization } from '../services/settings';
import { fetchUICustomization, saveUICustomization, DEFAULT_CUSTOMIZATION } from '../services/uiCustomization';
import { getSession } from '../services/auth';

export const useUICustomization = () => {
  const [searchParams] = useSearchParams();
  const [customization, setCustomization] = useState<UICustomization>({
    chatTitle: '',
    chatSubtitle: '',
    avatarUrl: DEFAULT_CUSTOMIZATION.avatarUrl,
    suggestedQuestions: {
      question1: '',
      question2: '',
      question3: '',
      question4: '',
    }
  });
  const [loading, setLoading] = useState(true);

  // Get group_id from URL or session
  const getGroupId = (): string | null => {
    const urlGroupId = searchParams.get('group');
    const session = getSession();
    const sessionGroupId = (session as any)?.selectedGroupId;
    return urlGroupId || sessionGroupId || null;
  };

  // Load customization from Supabase group table on mount and when group_id changes
  useEffect(() => {
    loadCustomization();
  }, [searchParams.get('group')]); // Reload when group_id changes

  const loadCustomization = async () => {
    setLoading(true);
    try {
      const groupId = getGroupId();
      if (!groupId) {
        console.warn('No group_id available, using empty values with default avatar');
        setCustomization({
          chatTitle: '',
          chatSubtitle: '',
          avatarUrl: DEFAULT_CUSTOMIZATION.avatarUrl,
          suggestedQuestions: {
            question1: '',
            question2: '',
            question3: '',
            question4: '',
          }
        });
        setLoading(false);
        return;
      }

      const data = await fetchUICustomization(groupId);
      setCustomization(data);
    } catch (error) {
      console.error('Failed to load UI customization:', error);
      setCustomization({
        chatTitle: '',
        chatSubtitle: '',
        avatarUrl: DEFAULT_CUSTOMIZATION.avatarUrl,
        suggestedQuestions: {
          question1: '',
          question2: '',
          question3: '',
          question4: '',
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCustomization = async (updates: Partial<UICustomization>) => {
    setLoading(true);
    try {
      const updatedCustomization = { ...customization, ...updates };
      
      // Check if update contains fields that should be saved to group table
      const hasGroupFields = 'chatTitle' in updates || 'chatSubtitle' in updates || 'suggestedQuestions' in updates || 'avatarUrl' in updates;
      
      if (hasGroupFields) {
        const groupId = getGroupId();
        if (!groupId) {
          console.error('No group_id available, cannot save UI customization to group table');
          setLoading(false);
          return;
        }

        // Save to Supabase group table (chat_title, chat_subtitle, suggested_questions, avatar_url)
        const success = await saveUICustomization(updatedCustomization, groupId);
        
        if (success) {
          setCustomization(updatedCustomization);
          console.log('✅ UI customization updated successfully');
        } else {
          console.error('Failed to save to Supabase group table');
        }
      } else {
        // For other non-group fields, just update state
        setCustomization(updatedCustomization);
      }
    } catch (error) {
      console.error('Failed to update UI customization:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetCustomization = async () => {
    setLoading(true);
    try {
      const groupId = getGroupId();
      if (!groupId) {
        console.error('No group_id available, cannot reset UI customization');
        setLoading(false);
        return;
      }

      // Save default values to group table
      const success = await saveUICustomization(DEFAULT_CUSTOMIZATION, groupId);
      if (success) {
        setCustomization(DEFAULT_CUSTOMIZATION);
      }
    } catch (error) {
      console.error('Failed to reset UI customization:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (questionKey: keyof UICustomization['suggestedQuestions'], value: string) => {
    updateCustomization({
      suggestedQuestions: {
        ...customization.suggestedQuestions,
        [questionKey]: value
      }
    });
  };

  return {
    customization,
    loading,
    updateCustomization,
    updateQuestion,
    resetCustomization
  };
};
