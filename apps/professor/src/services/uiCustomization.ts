import { getSupabaseClient } from './supabaseUserSpecific';
import { UICustomization } from './settings';
import { getSession } from './auth';

export const DEFAULT_CUSTOMIZATION: UICustomization = {
  chatTitle: 'TecAce Ax Pro',
  chatSubtitle: 'Select a conversation from the sidebar or start a new chat',
  avatarUrl: '/default-profile-avatar.png',
  suggestedQuestions: {
    question1: 'What is artificial intelligence?',
    question2: 'How does machine learning work?',
    question3: 'Explain quantum computing',
    question4: 'What are the benefits of cloud computing?'
  }
};

/**
 * Get group_id from URL or session
 */
function getGroupId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const urlGroupId = urlParams.get('group');
  const session = getSession();
  const sessionGroupId = (session as any)?.selectedGroupId;
  return urlGroupId || sessionGroupId || null;
}

/**
 * Fetch UI customization from Supabase group table based on group_id
 */
export async function fetchUICustomization(groupId?: string | null): Promise<UICustomization> {
  try {
    const targetGroupId = groupId || getGroupId();
    
    if (!targetGroupId) {
      console.warn('No group_id available, returning empty values with default avatar');
      return {
        chatTitle: '',
        chatSubtitle: '',
        avatarUrl: DEFAULT_CUSTOMIZATION.avatarUrl,
        suggestedQuestions: {
          question1: '',
          question2: '',
          question3: '',
          question4: '',
        }
      };
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('group')
      .select('chat_title, chat_subtitle, suggested_questions, avatar_url')
      .eq('group_id', targetGroupId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching UI customization from group table:', error);
      return {
        chatTitle: '',
        chatSubtitle: '',
        avatarUrl: DEFAULT_CUSTOMIZATION.avatarUrl,
        suggestedQuestions: {
          question1: '',
          question2: '',
          question3: '',
          question4: '',
        }
      };
    }

    if (!data) {
      console.log('No UI customization found in group table, returning empty values');
      return {
        chatTitle: '',
        chatSubtitle: '',
        avatarUrl: DEFAULT_CUSTOMIZATION.avatarUrl,
        suggestedQuestions: {
          question1: '',
          question2: '',
          question3: '',
          question4: '',
        }
      };
    }

    // Parse suggested_questions array from database
    const questions = Array.isArray(data.suggested_questions) 
      ? data.suggested_questions 
      : [];

    // Parse the settings from the database
    // Only apply default for avatarUrl, all other fields use empty strings if null/empty
    return {
      chatTitle: data.chat_title || '',
      chatSubtitle: data.chat_subtitle || '',
      avatarUrl: data.avatar_url && data.avatar_url.trim() !== '' ? data.avatar_url : DEFAULT_CUSTOMIZATION.avatarUrl,
      suggestedQuestions: {
        question1: questions[0] || '',
        question2: questions[1] || '',
        question3: questions[2] || '',
        question4: questions[3] || '',
      }
    };
  } catch (error) {
    console.error('Failed to fetch UI customization:', error);
    return {
      chatTitle: '',
      chatSubtitle: '',
      avatarUrl: DEFAULT_CUSTOMIZATION.avatarUrl,
      suggestedQuestions: {
        question1: '',
        question2: '',
        question3: '',
        question4: '',
      }
    };
  }
}

/**
 * Save UI customization to Supabase group table based on group_id
 */
export async function saveUICustomization(customization: UICustomization, groupId?: string | null): Promise<boolean> {
  try {
    const targetGroupId = groupId || getGroupId();
    
    if (!targetGroupId) {
      console.error('No group_id available, cannot save UI customization');
      return false;
    }

    const supabase = getSupabaseClient();

    // Convert suggestedQuestions object to array
    const suggestedQuestionsArray = [
      customization.suggestedQuestions.question1,
      customization.suggestedQuestions.question2,
      customization.suggestedQuestions.question3,
      customization.suggestedQuestions.question4,
    ];

    const { error } = await supabase
      .from('group')
      .update({
        chat_title: customization.chatTitle,
        chat_subtitle: customization.chatSubtitle,
        suggested_questions: suggestedQuestionsArray,
        avatar_url: customization.avatarUrl,
      })
      .eq('group_id', targetGroupId);

    if (error) {
      console.error('Error saving UI customization to group table:', error);
      return false;
    }

    console.log('✅ UI customization saved to group table for group_id:', targetGroupId);
    return true;
  } catch (error) {
    console.error('Failed to save UI customization:', error);
    return false;
  }
}

