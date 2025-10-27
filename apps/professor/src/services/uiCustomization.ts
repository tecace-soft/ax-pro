import { getSupabaseClient } from './supabaseUserSpecific';
import { UICustomization } from './settings';

const DEFAULT_CUSTOMIZATION: UICustomization = {
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
 * Fetch UI customization from Supabase
 * Uses a 'ui_settings' table with a single row (id = 'global')
 */
export async function fetchUICustomization(): Promise<UICustomization> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('ui_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (error) {
      console.error('Error fetching UI customization:', error);
      return DEFAULT_CUSTOMIZATION;
    }

    if (!data) {
      console.log('No UI customization found in database, using defaults');
      return DEFAULT_CUSTOMIZATION;
    }

    // Parse the settings from the database
    return {
      chatTitle: data.chat_title || DEFAULT_CUSTOMIZATION.chatTitle,
      chatSubtitle: data.chat_subtitle || DEFAULT_CUSTOMIZATION.chatSubtitle,
      avatarUrl: data.avatar_url || DEFAULT_CUSTOMIZATION.avatarUrl,
      suggestedQuestions: {
        question1: data.question_1 || DEFAULT_CUSTOMIZATION.suggestedQuestions.question1,
        question2: data.question_2 || DEFAULT_CUSTOMIZATION.suggestedQuestions.question2,
        question3: data.question_3 || DEFAULT_CUSTOMIZATION.suggestedQuestions.question3,
        question4: data.question_4 || DEFAULT_CUSTOMIZATION.suggestedQuestions.question4,
      }
    };
  } catch (error) {
    console.error('Failed to fetch UI customization:', error);
    return DEFAULT_CUSTOMIZATION;
  }
}

/**
 * Save UI customization to Supabase
 * Uses upsert to create or update the global settings
 */
export async function saveUICustomization(customization: UICustomization): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('ui_settings')
      .upsert({
        id: 'global',
        chat_title: customization.chatTitle,
        chat_subtitle: customization.chatSubtitle,
        avatar_url: customization.avatarUrl,
        question_1: customization.suggestedQuestions.question1,
        question_2: customization.suggestedQuestions.question2,
        question_3: customization.suggestedQuestions.question3,
        question_4: customization.suggestedQuestions.question4,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error saving UI customization:', error);
      return false;
    }

    console.log('✅ UI customization saved to Supabase');
    return true;
  } catch (error) {
    console.error('Failed to save UI customization:', error);
    return false;
  }
}

