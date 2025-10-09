import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService, ApiConfig } from '../services/settings';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    const loadedConfigs = settingsService.getConfigs();
    setConfigs(loadedConfigs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingConfig) {
      settingsService.updateConfig(editingConfig.id, formData);
    } else {
      settingsService.saveConfig({
        ...formData,
        isActive: configs.length === 0 // First config is active by default
      });
    }
    
    loadConfigs();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      baseUrl: '',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000
    });
    setShowAddForm(false);
    setEditingConfig(null);
  };

  const handleEdit = (config: ApiConfig) => {
    setFormData({
      name: config.name,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000
    });
    setEditingConfig(config);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      settingsService.deleteConfig(id);
      loadConfigs();
    }
  };

  const handleSetActive = (id: string) => {
    settingsService.setActiveConfig(id);
    loadConfigs();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/chat')}
            className="text-sm link"
          >
            ← Back to Chat
          </button>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            API Settings
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-sm px-3 py-1 rounded border"
            style={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          {/* Language Toggle */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            className="text-sm px-3 py-1 rounded border bg-transparent"
            style={{ 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            <option value="en">EN</option>
            <option value="ko">KO</option>
          </select>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="card p-6 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
              {editingConfig ? 'Edit Configuration' : 'Add New Configuration'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    Configuration Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder="e.g., OpenAI GPT-4"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    Base URL
                  </label>
                  <input
                    type="url"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder="https://api.openai.com/v1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder="sk-..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder="gpt-3.5-turbo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    Temperature: {formData.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="input w-full px-3 py-2 rounded-md"
                    min="1"
                    max="4000"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm border rounded-md"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {editingConfig ? 'Update' : 'Add'} Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Configurations List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              API Configurations
            </h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary px-4 py-2 text-sm"
            >
              + Add Configuration
            </button>
          </div>

          {configs.length === 0 ? (
            <div className="card p-8 rounded-lg text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No API configurations found. Add your first configuration to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`card p-4 rounded-lg ${
                    config.isActive ? 'border-2' : 'border'
                  }`}
                  style={{
                    borderColor: config.isActive ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: config.isActive ? 'var(--primary-light)' : 'var(--card)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium" style={{ color: 'var(--text)' }}>
                          {config.name}
                        </h3>
                        {config.isActive && (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {config.baseUrl}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Model: {config.model} • Temperature: {config.temperature} • Max Tokens: {config.maxTokens}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!config.isActive && (
                        <button
                          onClick={() => handleSetActive(config.id)}
                          className="text-xs px-3 py-1 rounded border"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-xs px-3 py-1 rounded border"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-xs px-3 py-1 rounded border"
                        style={{ 
                          borderColor: 'var(--error)',
                          color: 'var(--error)'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Simulation Info */}
        <div className="mt-8 card p-4 rounded-lg" style={{ backgroundColor: 'var(--warning-light)' }}>
          <div className="flex items-start space-x-2">
            <span>ℹ️</span>
            <div>
              <h3 className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
                Development Mode
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                When backend is unavailable, the system uses intelligent simulation based on your chat input. 
                Configure your API settings above for full functionality when backend is running.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
