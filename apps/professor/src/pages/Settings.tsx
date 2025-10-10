import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService, ApiConfig } from '../services/settings';
import { 
  getN8nConfigs, 
  addN8nConfig, 
  updateN8nConfig, 
  deleteN8nConfig, 
  setActiveN8nConfig,
  testN8nConnection,
  N8nConfig 
} from '../services/n8n';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
import { useUICustomization } from '../hooks/useUICustomization';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [n8nConfigs, setN8nConfigs] = useState<N8nConfig[]>([]);
  const [activeTab, setActiveTab] = useState<'api' | 'n8n' | 'ui'>('api');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
  const [editingN8nConfig, setEditingN8nConfig] = useState<N8nConfig | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const { customization, updateCustomization, updateQuestion, resetCustomization } = useUICustomization();

  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000
  });

  const [n8nFormData, setN8nFormData] = useState({
    name: '',
    webhookUrl: ''
  });

  useEffect(() => {
    loadConfigs();
    loadN8nConfigs();
  }, []);

  const loadConfigs = () => {
    const loadedConfigs = settingsService.getConfigs();
    setConfigs(loadedConfigs);
  };

  const loadN8nConfigs = () => {
    const loadedN8nConfigs = getN8nConfigs();
    setN8nConfigs(loadedN8nConfigs);
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

  // N8n form handlers
  const handleN8nSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingN8nConfig) {
      updateN8nConfig(editingN8nConfig.id, n8nFormData);
    } else {
      addN8nConfig({
        ...n8nFormData,
        isActive: n8nConfigs.length === 0
      });
    }
    
    loadN8nConfigs();
    resetN8nForm();
  };

  const resetN8nForm = () => {
    setN8nFormData({
      name: '',
      webhookUrl: ''
    });
    setShowAddForm(false);
    setEditingN8nConfig(null);
  };

  const handleN8nEdit = (config: N8nConfig) => {
    setN8nFormData({
      name: config.name,
      webhookUrl: config.webhookUrl
    });
    setEditingN8nConfig(config);
    setShowAddForm(true);
  };

  const handleN8nDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this n8n configuration?')) {
      deleteN8nConfig(id);
      loadN8nConfigs();
    }
  };

  const handleN8nSetActive = (id: string) => {
    setActiveN8nConfig(id);
    loadN8nConfigs();
  };

  const handleTestN8nConnection = async (webhookUrl: string) => {
    setTestingConnection(true);
    try {
      const isConnected = await testN8nConnection(webhookUrl);
      if (isConnected) {
        alert('✅ Connection successful!');
      } else {
        alert('❌ Connection failed. Please check your webhook URL.');
      }
    } catch (error) {
      alert('❌ Connection failed. Please check your webhook URL.');
    } finally {
      setTestingConnection(false);
    }
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
            Settings
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
        {/* Tab Navigation */}
        <div className="border-b mb-6" style={{ borderColor: 'var(--border)' }}>
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('api')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'api'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ color: activeTab === 'api' ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              API Configurations
            </button>
            <button
              onClick={() => setActiveTab('n8n')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'n8n'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ color: activeTab === 'n8n' ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              n8n Webhooks
            </button>
            <button
              onClick={() => setActiveTab('ui')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ui'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ color: activeTab === 'ui' ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              UI Customization
            </button>
          </nav>
        </div>
        {/* API Configurations Tab */}
        {activeTab === 'api' && (
          <>
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
          </>
        )}

        {/* n8n Webhooks Tab */}
        {activeTab === 'n8n' && (
          <>
            {/* Add/Edit n8n Form */}
            {showAddForm && (
              <div className="card p-6 rounded-lg mb-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  {editingN8nConfig ? 'Edit n8n Configuration' : 'Add New n8n Configuration'}
                </h2>
                
                <form onSubmit={handleN8nSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                        Configuration Name
                      </label>
                      <input
                        type="text"
                        value={n8nFormData.name}
                        onChange={(e) => setN8nFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder="e.g., Production n8n Webhook"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                        Webhook URL
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={n8nFormData.webhookUrl}
                          onChange={(e) => setN8nFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                          className="input flex-1 px-3 py-2 rounded-md"
                          placeholder="https://n8n.srv978041.hstgr.cloud/webhook/..."
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleTestN8nConnection(n8nFormData.webhookUrl)}
                          disabled={testingConnection || !n8nFormData.webhookUrl}
                          className="px-3 py-2 text-sm border rounded-md disabled:opacity-50"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          {testingConnection ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetN8nForm}
                      className="px-4 py-2 text-sm border rounded-md"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {editingN8nConfig ? 'Update' : 'Add'} Configuration
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* n8n Configurations List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  n8n Webhook Configurations
                </h2>
                <button
                  onClick={() => {
                    setActiveTab('n8n');
                    setShowAddForm(true);
                  }}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  + Add n8n Configuration
                </button>
              </div>

              {n8nConfigs.length === 0 ? (
                <div className="card p-8 rounded-lg text-center">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No n8n configurations found. Add your first n8n webhook to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {n8nConfigs.map((config) => (
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
                            {config.webhookUrl}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Created: {new Date(config.createdAt).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTestN8nConnection(config.webhookUrl)}
                            disabled={testingConnection}
                            className="text-xs px-3 py-1 rounded border disabled:opacity-50"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            {testingConnection ? 'Testing...' : 'Test'}
                          </button>
                          {!config.isActive && (
                            <button
                              onClick={() => handleN8nSetActive(config.id)}
                              className="text-xs px-3 py-1 rounded border"
                              style={{ borderColor: 'var(--border)' }}
                            >
                              Set Active
                            </button>
                          )}
                          <button
                            onClick={() => handleN8nEdit(config)}
                            className="text-xs px-3 py-1 rounded border"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleN8nDelete(config.id)}
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

            {/* n8n Info */}
            <div className="mt-8 card p-4 rounded-lg" style={{ backgroundColor: 'var(--primary-light)' }}>
              <div className="flex items-start space-x-2">
                <span>🔗</span>
                <div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                    n8n Webhook Integration
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Configure n8n webhooks to connect your chat interface with n8n workflows. 
                    The system will send chat messages to your n8n webhook and receive AI responses.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* UI Customization Tab */}
        {activeTab === 'ui' && (
          <div className="space-y-6">
            <div className="card p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                Chat Interface Customization
              </h2>
              
              <div className="space-y-6">
                {/* Chat Title */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    Chat Interface Title
                  </label>
                  <input
                    type="text"
                    value={customization.chatTitle}
                    onChange={(e) => updateCustomization({ chatTitle: e.target.value })}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder="e.g., Chat Interface, AI Assistant, etc."
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    This title appears at the top of the empty chat screen
                  </p>
                </div>

                {/* Chat Subtitle */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    Chat Interface Subtitle
                  </label>
                  <input
                    type="text"
                    value={customization.chatSubtitle}
                    onChange={(e) => updateCustomization({ chatSubtitle: e.target.value })}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder="e.g., Select a conversation from the sidebar or start a new chat"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    This subtitle appears below the title on the empty chat screen
                  </p>
                </div>

                {/* Suggested Questions */}
                <div>
                  <h3 className="text-md font-medium mb-4" style={{ color: 'var(--text)' }}>
                    Suggested Questions
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Customize the suggested questions that appear on the empty chat screen
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        Question 1
                      </label>
                      <input
                        type="text"
                        value={customization.suggestedQuestions.question1}
                        onChange={(e) => updateQuestion('question1', e.target.value)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder="What is artificial intelligence?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        Question 2
                      </label>
                      <input
                        type="text"
                        value={customization.suggestedQuestions.question2}
                        onChange={(e) => updateQuestion('question2', e.target.value)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder="How does machine learning work?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        Question 3
                      </label>
                      <input
                        type="text"
                        value={customization.suggestedQuestions.question3}
                        onChange={(e) => updateQuestion('question3', e.target.value)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder="Explain quantum computing"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        Question 4
                      </label>
                      <input
                        type="text"
                        value={customization.suggestedQuestions.question4}
                        onChange={(e) => updateQuestion('question4', e.target.value)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder="What are the benefits of cloud computing?"
                      />
                    </div>
                  </div>
                </div>

                {/* Reset Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reset all UI customizations to default values?')) {
                        resetCustomization();
                      }
                    }}
                    className="px-4 py-2 text-sm border rounded-md"
                    style={{ 
                      borderColor: 'var(--error)',
                      color: 'var(--error)'
                    }}
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="card p-6 rounded-lg">
              <h3 className="text-md font-medium mb-4" style={{ color: 'var(--text)' }}>
                Preview
              </h3>
              <div className="border rounded-lg p-6" style={{ 
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg)'
              }}>
                <div className="text-center">
                  <h1 className="text-4xl font-light mb-4" style={{ color: 'var(--text)' }}>
                    {customization.chatTitle}
                  </h1>
                  <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
                    {customization.chatSubtitle}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🤖</span>
                        <span className="text-sm">{customization.suggestedQuestions.question1}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🧠</span>
                        <span className="text-sm">{customization.suggestedQuestions.question2}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">⚛️</span>
                        <span className="text-sm">{customization.suggestedQuestions.question3}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">☁️</span>
                        <span className="text-sm">{customization.suggestedQuestions.question4}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
