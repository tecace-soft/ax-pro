import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService, ApiConfig } from '../services/settings';
import { useGroupAuth } from '../hooks/useGroupAuth';
import { withGroupParam } from '../utils/navigation';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n/I18nProvider';
import { useUICustomization } from '../hooks/useUICustomization';
import { isSimulationModeEnabled, setSimulationModeEnabled } from '../services/devMode';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  useGroupAuth(); // Require auth and group (also syncs URL)
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useTranslation();
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [activeTab, setActiveTab] = useState<'api' | 'ui'>('ui');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
  const { customization, updateCustomization, updateQuestion, resetCustomization } = useUICustomization();
  
  // Local state for inputs to prevent saving on every keystroke
  const [localChatTitle, setLocalChatTitle] = useState(customization.chatTitle);
  const [localChatSubtitle, setLocalChatSubtitle] = useState(customization.chatSubtitle);
  const [localQuestions, setLocalQuestions] = useState(customization.suggestedQuestions);
  
  // Sync local state when customization changes (e.g., from database load)
  useEffect(() => {
    setLocalChatTitle(customization.chatTitle);
    setLocalChatSubtitle(customization.chatSubtitle);
    setLocalQuestions(customization.suggestedQuestions);
  }, [customization.chatTitle, customization.chatSubtitle, customization.suggestedQuestions]);

  // Check URL parameters for tab navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'ui' || tab === 'photo') {
      setActiveTab('ui');
    }
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000
  });

  const [simulationModeEnabled, setSimulationModeEnabledState] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageZoom, setImageZoom] = useState(100);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState('');

  useEffect(() => {
    loadConfigs();
    loadSimulationMode();
  }, []);

  const loadSimulationMode = () => {
    const enabled = isSimulationModeEnabled();
    setSimulationModeEnabledState(enabled);
  };

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: 'var(--border)', flexShrink: 0 }}>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(withGroupParam('/chat'))}
            className="text-sm px-3 py-1 rounded border transition-colors hover:bg-gray-100"
            style={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-sm px-3 py-1 rounded border transition-colors hover:bg-gray-100"
            style={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }}>
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </button>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Settings
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="text-sm px-3 py-1 rounded border transition-colors hover:bg-gray-100"
            style={{ 
              backgroundColor: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            {theme === 'light' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
          
          {/* Language Toggle */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            className="text-sm px-3 py-1 rounded border"
            style={{ 
              borderColor: 'var(--border)',
              color: 'var(--text)',
              backgroundColor: 'var(--card)'
            }}
          >
            <option value="en">EN</option>
            <option value="ko">KO</option>
          </select>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Tab Navigation */}
        <div className="border-b mb-6" style={{ borderColor: 'var(--border)' }}>
          <nav className="-mb-px flex space-x-8">
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
              {language === 'ko' ? 'UI 커스터마이징' : 'UI Customization'}
            </button>
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
              {language === 'ko' ? 'API 설정' : 'API Configurations'}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
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

        {/* UI Customization Tab */}
        {activeTab === 'ui' && (
          <div className="space-y-6">
            <div className="card p-6 rounded-lg">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
                {language === 'ko' ? '채팅 인터페이스 커스터마이징' : 'Chat Interface Customization'}
              </h2>
              
              <div className="space-y-6">
                {/* Chat Title */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '채팅 인터페이스 제목' : 'Chat Interface Title'}
                  </label>
                  <input
                    type="text"
                    value={localChatTitle}
                    onChange={(e) => setLocalChatTitle(e.target.value)}
                    onBlur={() => updateCustomization({ chatTitle: localChatTitle })}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder={language === 'ko' ? '예: 채팅 인터페이스, AI 어시스턴트 등' : 'e.g., Chat Interface, AI Assistant, etc.'}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {language === 'ko' ? '이 제목은 빈 채팅 화면 상단에 표시됩니다' : 'This title appears at the top of the empty chat screen'}
                  </p>
                </div>

                {/* Chat Subtitle */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '채팅 인터페이스 부제목' : 'Chat Interface Subtitle'}
                  </label>
                  <input
                    type="text"
                    value={localChatSubtitle}
                    onChange={(e) => setLocalChatSubtitle(e.target.value)}
                    onBlur={() => updateCustomization({ chatSubtitle: localChatSubtitle })}
                    className="input w-full px-3 py-2 rounded-md"
                    placeholder={language === 'ko' ? '예: 사이드바에서 대화를 선택하거나 새 채팅을 시작하세요' : 'e.g., Select a conversation from the sidebar or start a new chat'}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {language === 'ko' ? '이 부제목은 빈 채팅 화면의 제목 아래에 표시됩니다' : 'This subtitle appears below the title on the empty chat screen'}
                  </p>
                </div>

                {/* Avatar Photo */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '챗봇 아바타' : 'Chatbot Avatar'}
                  </label>
                  
                  {/* Avatar Preview */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-shrink-0" style={{ width: '80px', height: '80px' }}>
                      <img 
                        src={customization.avatarUrl || '/default-profile-avatar.png'} 
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
                  
                  {/* Upload and Action Buttons */}
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
                    {customization.avatarUrl && customization.avatarUrl !== '/default-profile-avatar.png' && !customization.avatarUrl.startsWith('data:') && (
                      <button 
                        onClick={() => {
                          // Save current avatar as a preset
                          const link = document.createElement('a');
                          link.href = customization.avatarUrl;
                          link.download = 'chatbot-avatar.png';
                          link.click();
                        }}
                        className="px-4 py-2 rounded-md transition-all hover:opacity-90"
                        style={{ 
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: '1px solid rgba(16, 185, 129, 0.5)'
                        }}
                      >
                        {language === 'ko' ? '다운로드' : 'Download'}
                      </button>
                    )}
                    {customization.avatarUrl && (
                      <button 
                        onClick={() => updateCustomization({ avatarUrl: '' })}
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
                      ? '새 이미지를 업로드하여 챗봇 아바타를 설정하세요. 이미지를 업로드하면 자동으로 저장됩니다.' 
                      : 'Upload a new image to set your chatbot avatar. The image will be saved automatically when uploaded.'}
                  </p>
                </div>

                {/* Suggested Questions */}
                <div>
                  <h3 className="text-md font-medium mb-4" style={{ color: 'var(--text)' }}>
                    {language === 'ko' ? '추천 질문' : 'Suggested Questions'}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {language === 'ko' ? '빈 채팅 화면에 표시될 추천 질문을 커스터마이징하세요' : 'Customize the suggested questions that appear on the empty chat screen'}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {language === 'ko' ? '질문 1' : 'Question 1'}
                      </label>
                      <input
                        type="text"
                        value={localQuestions.question1}
                        onChange={(e) => setLocalQuestions({ ...localQuestions, question1: e.target.value })}
                        onBlur={() => updateQuestion('question1', localQuestions.question1)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder={language === 'ko' ? '인공지능이란 무엇인가요?' : 'What is artificial intelligence?'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {language === 'ko' ? '질문 2' : 'Question 2'}
                      </label>
                      <input
                        type="text"
                        value={localQuestions.question2}
                        onChange={(e) => setLocalQuestions({ ...localQuestions, question2: e.target.value })}
                        onBlur={() => updateQuestion('question2', localQuestions.question2)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder={language === 'ko' ? '머신러닝은 어떻게 작동하나요?' : 'How does machine learning work?'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {language === 'ko' ? '질문 3' : 'Question 3'}
                      </label>
                      <input
                        type="text"
                        value={localQuestions.question3}
                        onChange={(e) => setLocalQuestions({ ...localQuestions, question3: e.target.value })}
                        onBlur={() => updateQuestion('question3', localQuestions.question3)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder={language === 'ko' ? '양자 컴퓨팅을 설명해주세요' : 'Explain quantum computing'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                        {language === 'ko' ? '질문 4' : 'Question 4'}
                      </label>
                      <input
                        type="text"
                        value={localQuestions.question4}
                        onChange={(e) => setLocalQuestions({ ...localQuestions, question4: e.target.value })}
                        onBlur={() => updateQuestion('question4', localQuestions.question4)}
                        className="input w-full px-3 py-2 rounded-md"
                        placeholder={language === 'ko' ? '클라우드 컴퓨팅의 장점은 무엇인가요?' : 'What are the benefits of cloud computing?'}
                      />
                    </div>
                  </div>
                </div>

                {/* Reset Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const message = language === 'ko' 
                        ? '모든 UI 커스터마이징을 기본값으로 초기화하시겠습니까?' 
                        : 'Are you sure you want to reset all UI customizations to default values?';
                      if (window.confirm(message)) {
                        resetCustomization();
                      }
                    }}
                    className="px-4 py-2 text-sm border rounded-md"
                    style={{ 
                      borderColor: 'var(--error)',
                      color: 'var(--error)'
                    }}
                  >
                    {language === 'ko' ? '기본값으로 초기화' : 'Reset to Defaults'}
                  </button>
                </div>
              </div>
            </div>

            {/* Simulation Mode Setting */}
            <div className="card p-6 rounded-lg mt-6">
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

            {/* Reset All Data Section */}
            <div className="card p-6 rounded-lg mt-6">
              <h3 className="text-md font-medium mb-4" style={{ color: 'var(--text)' }}>
                Advanced
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    Reset All Data
                  </label>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Clear all stored settings, configurations, and cached data. This will reset the app to its default state.
                    You will need to log in again after reset.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reset all data? This action cannot be undone. You will be logged out.')) {
                        // Clear all storage
                        localStorage.clear();
                        sessionStorage.clear();
                        
                        // Show confirmation
                        alert('All data has been cleared. The page will now reload.');
                        
                        // Reload to login page
                        window.location.href = '/';
                      }
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    style={{ 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="card p-6 rounded-lg">
              <h3 className="text-md font-medium mb-4" style={{ color: 'var(--text)' }}>
                {language === 'ko' ? '미리보기' : 'Preview'}
              </h3>
              <div className="border rounded-lg p-6" style={{ 
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg)'
              }}>
                <div className="text-center">
                  <h1 className="text-4xl font-light mb-4" style={{ color: 'var(--text)' }}>
                    {localChatTitle}
                  </h1>
                  <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
                    {localChatSubtitle}
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
                        <span className="text-sm">{localQuestions.question1}</span>
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
                        <span className="text-sm">{localQuestions.question2}</span>
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
                        <span className="text-sm">{localQuestions.question3}</span>
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
                        <span className="text-sm">{localQuestions.question4}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  updateCustomization({ avatarUrl: uploadedAvatarUrl });
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
                      
                      updateCustomization({ avatarUrl: canvas.toDataURL('image/png', 0.95) });
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

export default Settings;
