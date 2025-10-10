import React, { useState } from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortable?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  sortable = true,
  pagination,
  onSort,
  className = ''
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (!sortable || !onSort) return;
    
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort(key, newDirection);
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    column.sortable && sortable ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                  style={{ 
                    color: 'var(--text-muted)',
                    width: column.width 
                  }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && sortable && (
                      <span className="text-xs">{getSortIcon(String(column.key))}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--text)' }}
                  >
                    {column.render 
                      ? column.render(row[column.key as keyof T], row)
                      : String(row[column.key as keyof T] || '')
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center space-x-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} results
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="text-sm px-2 py-1 rounded border"
              style={{ 
                backgroundColor: 'var(--card)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)' 
              }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  borderColor: 'var(--border)', 
                  color: 'var(--text-secondary)' 
                }}
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm" style={{ color: 'var(--text)' }}>
                {pagination.page}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page * pagination.pageSize >= pagination.total}
                className="px-3 py-1 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  borderColor: 'var(--border)', 
                  color: 'var(--text-secondary)' 
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
