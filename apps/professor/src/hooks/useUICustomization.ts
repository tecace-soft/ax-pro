import { useState, useEffect } from 'react';
import { settingsService, UICustomization } from '../services/settings';

export const useUICustomization = () => {
  const [customization, setCustomization] = useState<UICustomization>(() => 
    settingsService.getUICustomization()
  );
  const [loading, setLoading] = useState(false);

  const updateCustomization = (updates: Partial<UICustomization>) => {
    setLoading(true);
    try {
      const updatedCustomization = { ...customization, ...updates };
      settingsService.saveUICustomization(updatedCustomization);
      setCustomization(updatedCustomization);
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
