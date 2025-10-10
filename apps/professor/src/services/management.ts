export interface FileRow {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  contentType: string;
}

export interface IndexRow {
  id: string;
  name: string;
  chunks: number;
  status: 'queued' | 'indexing' | 'synced' | 'error';
  lastIndexedAt?: string;
}

export interface SyncRow {
  id: string;
  name: string;
  blobStatus: 'missing' | 'present';
  chunks: number;
  syncStatus: 'synced' | 'stale' | 'error';
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Mock data
const mockFiles: FileRow[] = [
  {
    id: '1',
    name: 'PSDAP_Program_Guide.pdf',
    size: 2048576, // 2MB
    lastModified: '2024-01-15T10:00:00Z',
    contentType: 'application/pdf'
  },
  {
    id: '2',
    name: 'API_Documentation.md',
    size: 512000, // 512KB
    lastModified: '2024-01-14T15:30:00Z',
    contentType: 'text/markdown'
  },
  {
    id: '3',
    name: 'User_Manual.docx',
    size: 1024000, // 1MB
    lastModified: '2024-01-13T09:15:00Z',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
];

const mockIndex: IndexRow[] = [
  {
    id: '1',
    name: 'PSDAP_Program_Guide.pdf',
    chunks: 45,
    status: 'synced',
    lastIndexedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'API_Documentation.md',
    chunks: 12,
    status: 'indexing',
    lastIndexedAt: '2024-01-14T16:00:00Z'
  },
  {
    id: '3',
    name: 'User_Manual.docx',
    chunks: 0,
    status: 'queued'
  }
];

const mockSync: SyncRow[] = [
  {
    id: '1',
    name: 'PSDAP_Program_Guide.pdf',
    blobStatus: 'present',
    chunks: 45,
    syncStatus: 'synced'
  },
  {
    id: '2',
    name: 'API_Documentation.md',
    blobStatus: 'present',
    chunks: 12,
    syncStatus: 'stale'
  },
  {
    id: '3',
    name: 'User_Manual.docx',
    blobStatus: 'missing',
    chunks: 0,
    syncStatus: 'error'
  }
];

export const listFiles = async (params: ListParams = {}): Promise<{ rows: FileRow[]; total: number }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let filteredFiles = [...mockFiles];
  
  // Apply search filter
  if (params.search) {
    filteredFiles = filteredFiles.filter(file => 
      file.name.toLowerCase().includes(params.search!.toLowerCase())
    );
  }
  
  // Apply sorting
  if (params.sortBy) {
    filteredFiles.sort((a, b) => {
      const aVal = a[params.sortBy as keyof FileRow];
      const bVal = b[params.sortBy as keyof FileRow];
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
    rows: filteredFiles.slice(startIndex, endIndex),
    total: filteredFiles.length
  };
};

export const deleteFile = async (id: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In production, this would make an API call
  console.log('Deleting file:', id);
};

export const listIndex = async (params: ListParams = {}): Promise<{ rows: IndexRow[]; total: number }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let filteredIndex = [...mockIndex];
  
  // Apply search filter
  if (params.search) {
    filteredIndex = filteredIndex.filter(item => 
      item.name.toLowerCase().includes(params.search!.toLowerCase())
    );
  }
  
  // Apply sorting
  if (params.sortBy) {
    filteredIndex.sort((a, b) => {
      const aVal = a[params.sortBy as keyof IndexRow];
      const bVal = b[params.sortBy as keyof IndexRow];
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
    rows: filteredIndex.slice(startIndex, endIndex),
    total: filteredIndex.length
  };
};

export const reindex = async (id: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // In production, this would make an API call
  console.log('Reindexing:', id);
};

export const listSync = async (params: ListParams = {}): Promise<{ rows: SyncRow[]; total: number }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let filteredSync = [...mockSync];
  
  // Apply search filter
  if (params.search) {
    filteredSync = filteredSync.filter(item => 
      item.name.toLowerCase().includes(params.search!.toLowerCase())
    );
  }
  
  // Apply sorting
  if (params.sortBy) {
    filteredSync.sort((a, b) => {
      const aVal = a[params.sortBy as keyof SyncRow];
      const bVal = b[params.sortBy as keyof SyncRow];
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
    rows: filteredSync.slice(startIndex, endIndex),
    total: filteredSync.length
  };
};
