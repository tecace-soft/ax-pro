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
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, SupabaseConfig } from '../services/supabase';
import { isSimulationModeEnabled, setSimulationModeEnabled } from '../services/devMode';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [n8nConfigs, setN8nConfigs] = useState<N8nConfig[]>([]);
  const [activeTab, setActiveTab] = useState<'api' | 'webhook' | 'ui' | 'database'>('api');
  const [databaseType, setDatabaseType] = useState<'supabase' | 'other'>('supabase');
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

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    url: '',
    anonKey: ''
  });

  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [simulationModeEnabled, setSimulationModeEnabledState] = useState(false);

  useEffect(() => {
    loadConfigs();
    loadN8nConfigs();
    loadSupabaseConfig();
    loadSimulationMode();
  }, []);

  const loadSupabaseConfig = () => {
    const config = getSupabaseConfig();
    setSupabaseConfig(config);
  };

  const loadSimulationMode = () => {
    const enabled = isSimulationModeEnabled();
    setSimulationModeEnabledState(enabled);
  };

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
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'api'
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                color: activeTab === 'api' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'api' ? 'var(--primary)' : 'transparent'
              }}
            >
              API Configurations
            </button>
            <button
              onClick={() => setActiveTab('webhook')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'webhook'
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                color: activeTab === 'webhook' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'webhook' ? 'var(--primary)' : 'transparent'
              }}
            >
              Webhooks
            </button>
            <button
              onClick={() => setActiveTab('ui')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ui'
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                color: activeTab === 'ui' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'ui' ? 'var(--primary)' : 'transparent'
              }}
            >
              UI Customization
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'database'
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={{ 
                color: activeTab === 'database' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'database' ? 'var(--primary)' : 'transparent'
              }}
            >
              Database
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

        {/* Webhooks Tab */}
        {activeTab === 'webhook' && (
          <>
            {/* Add/Edit n8n Form */}
            {showAddForm && (
              <div className="card p-6 rounded-lg mb-6">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  {editingN8nConfig ? 'Edit Webhook Configuration' : 'Add New Webhook Configuration'}
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
                  Webhook Configurations
                </h2>
                <button
                  onClick={() => {
                    setActiveTab('webhook');
                    setShowAddForm(true);
                  }}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  + Add Webhook Configuration
                </button>
              </div>

              {n8nConfigs.length === 0 ? (
                <div className="card p-8 rounded-lg text-center">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No webhook configurations found. Add your first webhook to get started.
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

            {/* Webhook Info */}
            <div className="mt-8 card p-4 rounded-lg" style={{ backgroundColor: 'var(--primary-light)' }}>
              <div className="flex items-start space-x-2">
                <span>🔗</span>
                <div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                    Webhook Integration
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Configure webhooks to connect your chat interface with external workflows (e.g., n8n). 
                    The system will send chat messages to your webhook and receive AI responses.
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

                {/* Avatar URL */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    Chatbot Avatar URL
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <img 
                        src={customization.avatarUrl} 
                        alt="Avatar Preview" 
                        className="w-12 h-12 rounded-full border-2"
                        style={{ 
                          borderColor: 'var(--border)',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.currentTarget.src = '/default-profile-avatar.png';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={customization.avatarUrl}
                        onChange={(e) => updateCustomization({ avatarUrl: e.target.value })}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder="https://example.com/avatar.png or data:image/svg+xml;base64,..."
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Enter an image URL or data URI. This avatar appears next to assistant messages.
                      </p>
                    </div>
                  </div>
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
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <circle cx="12" cy="5" r="2"/>
                            <path d="M12 7v4"/>
                          </svg>
                        </div>
                        <span className="text-sm">{customization.suggestedQuestions.question1}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                          </svg>
                        </div>
                        <span className="text-sm">{customization.suggestedQuestions.question2}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M8 12h8"/>
                            <path d="M12 8v8"/>
                          </svg>
                        </div>
                        <span className="text-sm">{customization.suggestedQuestions.question3}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 text-left rounded-lg border" style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--text)'
                    }}>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                          </svg>
                        </div>
                        <span className="text-sm">{customization.suggestedQuestions.question4}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database Configuration Tab */}
        {activeTab === 'database' && (
          <div className="card p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Database Configuration
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Configure your database connection for prompt management and data storage.
            </p>

            <div className="space-y-4">
              {/* Database Type Selector */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Database Type
                </label>
                <select
                  value={databaseType}
                  onChange={(e) => setDatabaseType(e.target.value as 'supabase' | 'other')}
                  className="input w-full px-3 py-2 rounded-md"
                  style={{ 
                    backgroundColor: 'var(--card)',
                    color: 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <option value="supabase">Supabase</option>
                  <option value="other">Other (Coming Soon)</option>
                </select>
              </div>

              {/* Supabase Configuration */}
              {databaseType === 'supabase' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                      Supabase URL
                    </label>
                    <input
                      type="text"
                      value={supabaseConfig.url}
                      onChange={(e) => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                      className="input w-full px-3 py-2 rounded-md"
                      placeholder="https://your-project.supabase.co"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                      Supabase Anon Key
                    </label>
                    <input
                      type="password"
                      value={supabaseConfig.anonKey}
                      onChange={(e) => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                      className="input w-full px-3 py-2 rounded-md"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                  </div>
                </>
              )}

              {databaseType === 'supabase' && supabaseTestResult && (
                <div 
                  className="p-3 rounded-md"
                  style={{
                    backgroundColor: supabaseTestResult.success ? 'var(--success-light)' : 'var(--danger-light)',
                    color: supabaseTestResult.success ? 'var(--success)' : 'var(--danger)'
                  }}
                >
                  {supabaseTestResult.message}
                </div>
              )}

              {databaseType === 'supabase' && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setTestingSupabase(true);
                      setSupabaseTestResult(null);
                      try {
                        const success = await testSupabaseConnection(supabaseConfig);
                        setSupabaseTestResult({
                          success,
                          message: success 
                            ? 'Connection successful!' 
                            : 'Connection failed. Please check your credentials.'
                        });
                      } catch (error) {
                        setSupabaseTestResult({
                          success: false,
                          message: 'Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
                        });
                      } finally {
                        setTestingSupabase(false);
                      }
                    }}
                    disabled={testingSupabase || !supabaseConfig.url || !supabaseConfig.anonKey}
                    className="btn-ghost px-4 py-2 rounded-md"
                  >
                    {testingSupabase ? 'Testing...' : 'Test Connection'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      saveSupabaseConfig(supabaseConfig);
                      setSupabaseTestResult({
                        success: true,
                        message: 'Configuration saved successfully!'
                      });
                    }}
                    disabled={!supabaseConfig.url || !supabaseConfig.anonKey}
                    className="btn-primary px-4 py-2 rounded-md"
                  >
                    Save Configuration
                  </button>
                </div>
              )}

              {/* Simulation Mode Setting */}
              <div className="border-t pt-4 mt-6" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-md font-medium mb-4" style={{ color: 'var(--text)' }}>
                  Chat Behavior
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                      Enable Simulation Mode
                    </label>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      When enabled, chat will fall back to simulated responses if the chatbot server is unavailable.
                      When disabled, chat will show an error instead of simulation.
                    </p>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={simulationModeEnabled}
                      onChange={(e) => {
                        setSimulationModeEnabledState(e.target.checked);
                        setSimulationModeEnabled(e.target.checked);
                      }}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--primary)' }}
                    />
                  </label>
                </div>
              </div>

              {databaseType === 'other' && (
                <div className="p-4 rounded-md" style={{ backgroundColor: 'var(--warning-light)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Additional database types will be available in future updates.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
