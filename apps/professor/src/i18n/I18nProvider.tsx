import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'ko';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANG_STORAGE_KEY = 'axpro_lang';

const translations = {
  en: {
    'app.brand': 'AX PRO PLATFORM',
    'auth.title.chat': 'Sign in',
    'auth.title.admin': 'Sign in',
    'auth.subtitle.chat': 'Continue to the Chat Interface',
    'auth.subtitle.admin': 'Continue to the Administrative Console',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.continue': 'Continue',
    'auth.error': 'Invalid credentials. Try the demo accounts.',
    'auth.demoHint': 'Demo: demo@tecace.com / demo1234 · admin@tecace.com / admin1234',
    'link.toAdmin': 'Sign in to the Admin Console',
    'link.toChat': 'Use Chat Interface sign-in',
    'ui.theme.light': 'Light',
    'ui.theme.dark': 'Dark',
    'ui.lang.en': 'English',
    'ui.lang.ko': '한국어',
    'chat.title': 'Chat Interface',
    'chat.welcome': 'Welcome to the chat interface',
    'dashboard.title': 'Admin Console',
    'dashboard.welcome': 'Welcome to the admin console',
    'auth.signOut': 'Sign out',
    'dashboard.timeline': 'Performance Timeline',
    'dashboard.activity': 'Daily Message Activity',
    'usage.sessions': 'Recent Conversations',
    'usage.messages': 'Messages',
    'usage.feedback.admin': 'Admin Feedback',
    'usage.feedback.user': 'User Feedback',
    'mgmt.prompt': 'Prompt Control',
    'mgmt.knowledge': 'Knowledge Management',
    'actions.new': 'New',
    'actions.refresh': 'Refresh',
    'actions.save': 'Save',
    'actions.revert': 'Revert',
    'actions.test': 'Test',
    'actions.open': 'Open',
    'actions.rename': 'Rename',
    'actions.close': 'Close',
    'actions.delete': 'Delete',
    'filters.status': 'Status',
    'filters.search': 'Search',
    'labels.title': 'Title',
    'labels.lastActivity': 'Last activity',
    'labels.count': 'Count',
    'labels.status': 'Status',
  },
  ko: {
    'app.brand': 'AX PRO 플랫폼',
    'auth.title.chat': '로그인',
    'auth.title.admin': '로그인',
    'auth.subtitle.chat': '채팅 인터페이스로 이동',
    'auth.subtitle.admin': '관리자 콘솔로 이동',
    'auth.email': '이메일',
    'auth.password': '비밀번호',
    'auth.continue': '계속',
    'auth.error': '계정 정보가 올바르지 않습니다. 데모 계정을 사용해 보세요.',
    'auth.demoHint': '데모: demo@tecace.com / demo1234 · admin@tecace.com / admin1234',
    'link.toAdmin': '관리자 콘솔로 이동',
    'link.toChat': '채팅 인터페이스로 이동',
    'ui.theme.light': '라이트',
    'ui.theme.dark': '다크',
    'ui.lang.en': '영어',
    'ui.lang.ko': '한국어',
    'chat.title': '채팅 인터페이스',
    'chat.welcome': '채팅 인터페이스에 오신 것을 환영합니다',
    'dashboard.title': '관리자 콘솔',
    'dashboard.welcome': '관리자 콘솔에 오신 것을 환영합니다',
    'auth.signOut': '로그아웃',
    'dashboard.timeline': '성능 타임라인',
    'dashboard.activity': '일일 메시지 활동',
    'usage.sessions': '최근 대화',
    'usage.messages': '메시지',
    'usage.feedback.admin': '관리자 피드백',
    'usage.feedback.user': '사용자 피드백',
    'mgmt.prompt': '프롬프트 제어',
    'mgmt.knowledge': '지식 관리',
    'actions.new': '새로 만들기',
    'actions.refresh': '새로고침',
    'actions.save': '저장',
    'actions.revert': '되돌리기',
    'actions.test': '테스트',
    'actions.open': '열기',
    'actions.rename': '이름 변경',
    'actions.close': '닫기',
    'actions.delete': '삭제',
    'filters.status': '상태',
    'filters.search': '검색',
    'labels.title': '제목',
    'labels.lastActivity': '마지막 활동',
    'labels.count': '개수',
    'labels.status': '상태',
  },
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return (stored === 'en' || stored === 'ko') ? stored : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[Language]] || key;
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useT = (): ((key: string) => string) => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useT must be used within an I18nProvider');
  }
  return context.t;
};

export const useTranslation = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
