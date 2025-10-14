import { useState, useEffect } from 'react';
import { settingsService, UICustomization } from '../services/settings';
import { fetchUICustomization, saveUICustomization } from '../services/uiCustomization';

export const useUICustomization = () => {
  const [customization, setCustomization] = useState<UICustomization>(() => 
    settingsService.getUICustomization()
  );
  const [loading, setLoading] = useState(true);

  // Load customization from Supabase on mount
  useEffect(() => {
    loadCustomization();
  }, []);

  const loadCustomization = async () => {
    setLoading(true);
    try {
      const data = await fetchUICustomization();
      setCustomization(data);
      // Also save to localStorage as cache
      settingsService.saveUICustomization(data);
    } catch (error) {
      console.error('Failed to load UI customization:', error);
      // Fallback to localStorage
      const localData = settingsService.getUICustomization();
      setCustomization(localData);
    } finally {
      setLoading(false);
    }
  };

  const updateCustomization = async (updates: Partial<UICustomization>) => {
    setLoading(true);
    try {
      const updatedCustomization = { ...customization, ...updates };
      
      // Save to Supabase first
      const success = await saveUICustomization(updatedCustomization);
      
      if (success) {
        // Update local state
        setCustomization(updatedCustomization);
        // Also save to localStorage as cache
        settingsService.saveUICustomization(updatedCustomization);
        console.log('✅ UI customization updated successfully');
      } else {
        console.error('Failed to save to Supabase, falling back to localStorage');
        settingsService.saveUICustomization(updatedCustomization);
        setCustomization(updatedCustomization);
      }
    } catch (error) {
      console.error('Failed to update UI customization:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetCustomization = () => {
    setLoading(true);
    try {
      settingsService.resetUICustomization();
      const defaultCustomization = settingsService.getUICustomization();
      setCustomization(defaultCustomization);
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
