export interface SessionRow {
  id: string;
  title: string;
  status: 'open' | 'closed';
  lastAt: string;
  messageCount: number;
}

export interface MessageRow {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  feedback?: 'up' | 'down';
  citations?: Citation[];
}

export interface Citation {
  sourceType: 'web' | 'document' | 'kb' | 'blob';
  title?: string;
  url?: string;
  snippet?: string;
  metadata?: Record<string, any>;
}

export interface AdminFeedback {
  id: string;
  requestId: string;
  corrected: string;
  createdAt: string;
}

export interface UserFeedback {
  id: string;
  messageId: string;
  rating: 1 | -1;
  note?: string;
  createdAt: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'all' | 'open' | 'closed';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Mock data
const mockSessions: SessionRow[] = [
  {
    id: '1',
    title: 'PSDAP Program Discussion',
    status: 'open',
    lastAt: '2024-01-15T10:30:00Z',
    messageCount: 12
  },
  {
    id: '2',
    title: 'API Integration Help',
    status: 'closed',
    lastAt: '2024-01-14T15:45:00Z',
    messageCount: 8
  },
  {
    id: '3',
    title: 'General Questions',
    status: 'open',
    lastAt: '2024-01-13T09:20:00Z',
    messageCount: 15
  }
];

const mockMessages: MessageRow[] = [
  {
    id: '1',
    sessionId: '1',
    role: 'user',
    content: 'What is the PSDAP program?',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    sessionId: '1',
    role: 'assistant',
    content: 'The PSDAP program is a comprehensive development initiative...',
    createdAt: '2024-01-15T10:31:00Z',
    feedback: 'up',
    citations: [
      {
        sourceType: 'document',
        title: 'PSDAP Program Guide',
        snippet: 'The PSDAP program provides...'
      }
    ]
  }
];

const mockAdminFeedback: AdminFeedback[] = [
  {
    id: '1',
    requestId: 'req-123',
    corrected: 'The PSDAP program is a comprehensive development initiative that focuses on...',
    createdAt: '2024-01-15T11:00:00Z'
  }
];

const mockUserFeedback: UserFeedback[] = [
  {
    id: '1',
    messageId: '2',
    rating: 1,
    note: 'Very helpful response',
    createdAt: '2024-01-15T10:35:00Z'
  }
];

export const listSessions = async (params: ListParams = {}): Promise<{ rows: SessionRow[]; total: number }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let filteredSessions = [...mockSessions];
  
  // Apply filters
  if (params.search) {
    filteredSessions = filteredSessions.filter(session => 
      session.title.toLowerCase().includes(params.search!.toLowerCase())
    );
  }
  
  if (params.status && params.status !== 'all') {
    filteredSessions = filteredSessions.filter(session => session.status === params.status);
  }
  
  // Apply sorting
  if (params.sortBy) {
    filteredSessions.sort((a, b) => {
      const aVal = a[params.sortBy as keyof SessionRow];
      const bVal = b[params.sortBy as keyof SessionRow];
      const direction = params.sortDirection === 'desc' ? -1 : 1;
      return aVal < bVal ? -1 * direction : aVal > bVal ? 1 * direction : 0;
    });
  }
  
  // Apply pagination
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    rows: filteredSessions.slice(startIndex, endIndex),
    total: filteredSessions.length
  };
};

export const listMessages = async (sessionId: string, params: ListParams = {}): Promise<{ rows: MessageRow[]; total: number }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const sessionMessages = mockMessages.filter(msg => msg.sessionId === sessionId);
  
  // Apply pagination
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    rows: sessionMessages.slice(startIndex, endIndex),
    total: sessionMessages.length
  };
};

export const upsertAdminFeedback = async (item: AdminFeedback): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In production, this would make an API call
  console.log('Upserting admin feedback:', item);
};

export const setUserFeedback = async (messageId: string, rating: 1 | -1, note?: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In production, this would make an API call
  console.log('Setting user feedback:', { messageId, rating, note });
};

export const renameSession = async (id: string, title: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In production, this would make an API call
  console.log('Renaming session:', { id, title });
};

export const closeSession = async (id: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In production, this would make an API call
  console.log('Closing session:', id);
};

export const deleteSession = async (id: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In production, this would make an API call
  console.log('Deleting session:', id);
};

export const getAdminFeedback = async (params: ListParams = {}): Promise<{ rows: AdminFeedback[]; total: number }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    rows: mockAdminFeedback,
    total: mockAdminFeedback.length
  };
};

export const getUserFeedback = async (params: ListParams = {}): Promise<{ rows: UserFeedback[]; total: number }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    rows: mockUserFeedback,
    total: mockUserFeedback.length
  };
};
