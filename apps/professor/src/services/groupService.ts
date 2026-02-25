import { createClient } from '@supabase/supabase-js';

// Default Supabase credentials for group operations (Admin's database)
const DEFAULT_SUPABASE_URL = 'https://qpyteahuynkgkbmdasbv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY';

// Create default Supabase client for group operations
export const defaultSupabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

export interface User {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  groups?: string[];
}

export interface Group {
  id: number;
  created_at: string;
  name: string;
  administrator: string;
  users: string[];
  group_id: string;
  openai_chat?: boolean;
  vector_store_id?: string;
}

export interface CreateGroupData {
  group_id: string;
  name: string;
  administrator: string;
  users: string[];
  chat_title?: string;
  chat_subtitle?: string;
  suggested_questions?: string[];
  avatar_url?: string;
  openai_chat?: boolean;
  vector_store_id?: string;
}

/**
 * Search for users by first name, last name, or email
 */
export async function searchUsers(searchTerm: string): Promise<User[]> {
  try {
    const { data, error } = await defaultSupabase
      .from('user')
      .select('id, user_id, first_name, last_name, email, groups')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }

    return data as User[] || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new group in the database
 */
export async function createGroup(groupData: CreateGroupData): Promise<Group> {
  try {
    const { data, error } = await defaultSupabase
      .from('group')
      .insert({
        group_id: groupData.group_id,
        name: groupData.name,
        administrator: groupData.administrator,
        users: groupData.users,
        chat_title: groupData.chat_title,
        chat_subtitle: groupData.chat_subtitle,
        suggested_questions: groupData.suggested_questions,
        avatar_url: groupData.avatar_url,
        openai_chat: groupData.openai_chat ?? false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create group: ${error.message} (Code: ${error.code})`);
    }

    if (!data) {
      throw new Error('Group creation succeeded but no data was returned');
    }
    // Always create OpenAI vector store (openai_chat check removed)
    // After the group is created in Supabase, create a dedicated OpenAI vector store
    // and save its ID to the group's vector_store_id column.
    {
      try {
        const openaiApiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
        if (!openaiApiKey) {
        } else {
          // Build unique vector store name: "Vector Store - <group name> - YYMMDDhhmmss"
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const year = now.getFullYear().toString().slice(-2); // YY
          const month = pad(now.getMonth() + 1);               // MM
          const day = pad(now.getDate());                      // DD
          const hour = pad(now.getHours());                    // hh
          const minute = pad(now.getMinutes());                // mm
          const seconds = pad(now.getSeconds());               // ss
          const timestamp = `${year}${month}${day}${hour}${minute}${seconds}`;
          const vectorStoreName = `Vector Store - ${groupData.name} - ${timestamp}`;
          const response = await fetch('https://api.openai.com/v1/vector_stores', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: vectorStoreName
            })
          });
          if (response.ok) {
            const vsData = await response.json();
            const vectorStoreId = vsData?.id;
            if (vectorStoreId) {
              const { error: updateError } = await defaultSupabase
                .from('group')
                .update({ vector_store_id: vectorStoreId })
                .eq('group_id', groupData.group_id);

              if (updateError) {
              } else {
                // Also reflect this in the returned group object
                (data as any).vector_store_id = vectorStoreId;
              }
            } else {
            }
          } else {
            const errorText = await response.text();
            let errorJson: any;
            try {
              errorJson = JSON.parse(errorText);
            } catch {
              errorJson = { error: errorText };
            }
          }
        }
      } catch (openaiError) {
        // Do not throw here; group creation in Supabase has already succeeded
      }
    }
    // NOTE: openai_chat check removed - always creating vector store

    return data as Group;
  } catch (error) {
    throw error;
  }
}

/**
 * Update user groups array for multiple users
 */
export async function updateUserGroups(userIds: string[], groupId: string): Promise<void> {
  try {
    // Get current user data to update groups array
    const { data: users, error: fetchError } = await defaultSupabase
      .from('user')
      .select('user_id, groups')
      .in('user_id', userIds);

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    // Update each user's groups array
    const updatePromises = users.map(async (user) => {
      const currentGroups = user.groups || [];
      const updatedGroups = currentGroups.includes(groupId) 
        ? currentGroups 
        : [...currentGroups, groupId];

      const { error: updateError } = await defaultSupabase
        .from('user')
        .update({ groups: updatedGroups })
        .eq('user_id', user.user_id);

      if (updateError) {
        throw new Error(`Failed to update user groups: ${updateError.message}`);
      }
    });

    await Promise.all(updatePromises);
  } catch (error) {
    throw error;
  }
}

/**
 * Get groups for a specific user based on their groups array
 */
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    // First get the user's groups array
    const { data: userData, error: userError } = await defaultSupabase
      .from('user')
      .select('groups')
      .eq('user_id', userId)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    const userGroups = userData?.groups || [];
    
    if (userGroups.length === 0) {
      return []; // No groups to fetch
    }

    // Fetch all groups that match the user's group_ids
    const { data: groups, error: groupsError } = await defaultSupabase
      .from('group')
      .select('*')
      .in('group_id', userGroups)
      .order('created_at', { ascending: false });

    if (groupsError) {
      throw new Error(`Failed to fetch groups: ${groupsError.message}`);
    }

    return groups as Group[] || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Get group by group_id
 */
export async function getGroupById(groupId: string): Promise<Group | null> {
  try {
    const { data, error } = await defaultSupabase
      .from('group')
      .select('*')
      .eq('group_id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No group found
      }
      throw new Error(`Failed to fetch group: ${error.message}`);
    }

    return data as Group;
  } catch (error) {
    throw error;
  }
}

/**
 * Update group name
 */
export async function updateGroupName(groupId: string, name: string): Promise<void> {
  try {
    const { error } = await defaultSupabase
      .from('group')
      .update({ name })
      .eq('group_id', groupId);

    if (error) {
      throw new Error(`Failed to update group name: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Get users by user_ids array
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  try {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await defaultSupabase
      .from('user')
      .select('id, user_id, first_name, last_name, email, groups')
      .in('user_id', userIds);

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data as User[] || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Update group users array (add or remove users)
 */
export async function updateGroupUsers(groupId: string, userIds: string[]): Promise<void> {
  try {
    const { error } = await defaultSupabase
      .from('group')
      .update({ users: userIds })
      .eq('group_id', groupId);

    if (error) {
      throw new Error(`Failed to update group users: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Update group chunking options (chunk_size and chunk_overlap)
 * Both values can be null - if either is null, chunking_options won't be passed to n8n
 */
export async function updateGroupChunkingOptions(
  groupId: string, 
  chunkSize: number | null, 
  chunkOverlap: number | null
): Promise<void> {
  try {
    const { error } = await defaultSupabase
      .from('group')
      .update({ 
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      })
      .eq('group_id', groupId);

    if (error) {
      throw new Error(`Failed to update group chunking options: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Update group top_k value
 * Can be null to use default value
 */
export async function updateGroupTopK(
  groupId: string, 
  topK: number | null
): Promise<void> {
  try {
    const { error } = await defaultSupabase
      .from('group')
      .update({ 
        top_k: topK
      })
      .eq('group_id', groupId);

    if (error) {
      throw new Error(`Failed to update group top_k: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Update group openai_chat setting
 */
export async function updateGroupOpenAIChat(
  groupId: string, 
  openaiChat: boolean
): Promise<void> {
  try {
    const { error } = await defaultSupabase
      .from('group')
      .update({ 
        openai_chat: openaiChat
      })
      .eq('group_id', groupId);

    if (error) {
      throw new Error(`Failed to update group openai_chat: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a group and all associated data from Supabase.
 * This will:
 * - Remove the group_id from all users' groups arrays (based on group.users)
 * - Delete admin_feedback, user_feedback, chat, session, files, prompts rows for this group
 * - Delete documents where metadata->>groupId matches the group_id
 * - Finally delete the group row itself
 */
export async function deleteGroupAndAllData(groupId: string): Promise<void> {
  try {
    // 1) Load group to get users array, openai_chat, and vector_store_id
    const { data: groupData, error: groupError } = await defaultSupabase
      .from('group')
      .select('group_id, name, users, openai_chat, vector_store_id')
      .eq('group_id', groupId)
      .maybeSingle();

    if (groupError) {
      throw new Error(`Failed to fetch group before delete: ${groupError.message}`);
    }

    if (!groupData) {
      return;
    }

    // 2) Remove group_id from all users' groups arrays (if any)
    const groupUsers: string[] = Array.isArray(groupData.users) ? groupData.users : [];
    if (groupUsers.length > 0) {
      for (const userId of groupUsers) {
        try {
          const { data: userData, error: userError } = await defaultSupabase
            .from('user')
            .select('groups')
            .eq('user_id', userId)
            .maybeSingle();

          if (!userError && userData && Array.isArray(userData.groups)) {
            const updatedGroups = (userData.groups as string[]).filter((g: string) => g !== groupId);
            const { error: updateUserError } = await defaultSupabase
              .from('user')
              .update({ groups: updatedGroups })
              .eq('user_id', userId);

            if (updateUserError) {
            }
          }
        } catch (userUpdateError) {
        }
      }
    }

    // 3) Delete admin_feedback rows
    try {
      const { error } = await defaultSupabase
        .from('admin_feedback')
        .delete()
        .eq('group_id', groupId);
      if (error) {
        throw new Error(`Failed to delete admin_feedback rows: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }

    // 4) Delete user_feedback rows
    try {
      const { error } = await defaultSupabase
        .from('user_feedback')
        .delete()
        .eq('group_id', groupId);
      if (error) {
        throw new Error(`Failed to delete user_feedback rows: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }

    // 5) Delete chat rows
    try {
      const { error } = await defaultSupabase
        .from('chat')
        .delete()
        .eq('group_id', groupId);
      if (error) {
        throw new Error(`Failed to delete chat rows: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }

    // 6) Delete session rows
    try {
      const { error } = await defaultSupabase
        .from('session')
        .delete()
        .eq('group_id', groupId);
      if (error) {
        throw new Error(`Failed to delete session rows: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }

    // 7) Delete files rows
    try {
      const { error } = await defaultSupabase
        .from('files')
        .delete()
        .eq('group_id', groupId);
      if (error) {
        throw new Error(`Failed to delete files rows: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }

    // 8) Delete prompts rows
    try {
      const { error } = await defaultSupabase
        .from('prompts')
        .delete()
        .eq('group_id', groupId);
      if (error) {
        throw new Error(`Failed to delete prompts rows: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }

    // 9) Delete documents rows where metadata->>groupId = groupId
    try {
      const { error } = await defaultSupabase
        .from('documents')
        .delete()
        .eq('metadata->>groupId', groupId);
      if (error) {
        throw new Error(`Failed to delete documents rows: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }

    // 10) Always delete OpenAI vector store and associated files (openai_chat check removed)
    if (groupData.vector_store_id) {
      try {
        const openaiApiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
        if (!openaiApiKey) {
        } else {
          const vectorStoreId = groupData.vector_store_id;
          
          // Step 1: Get list of files in the vector store
          const listFilesUrl = `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`;
          
          const listResponse = await fetch(listFilesUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
            },
          });
          
          if (listResponse.ok) {
            const listData = await listResponse.json();
            const files = listData?.data || [];
            
            // Step 2: Delete each file from OpenAI
            if (files.length > 0) {
              let deletedCount = 0;
              let failedCount = 0;
              
              for (const file of files) {
                const fileId = file.id;
                if (!fileId) {
                  continue;
                }
                
                try {
                  const deleteFileUrl = `https://api.openai.com/v1/files/${fileId}`;
                  const deleteFileResponse = await fetch(deleteFileUrl, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${openaiApiKey}`,
                    },
                  });
                  
                  if (deleteFileResponse.ok) {
                    const deleteData = await deleteFileResponse.json().catch(() => ({}));
                    deletedCount++;
                  } else {
                    const errorData = await deleteFileResponse.json().catch(() => ({ error: 'Unknown error' }));
                    failedCount++;
                  }
                } catch (fileError) {
                  failedCount++;
                }
              }
            } else {
            }
          } else {
            const errorData = await listResponse.json().catch(() => ({ error: 'Unknown error' }));
            // Continue with vector store deletion even if we couldn't list files
          }
          
          // Step 3: Delete the vector store itself
          const deleteVectorStoreUrl = `https://api.openai.com/v1/vector_stores/${vectorStoreId}`;
          
          const deleteResponse = await fetch(deleteVectorStoreUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
            },
          });
          if (deleteResponse.ok) {
            const responseData = await deleteResponse.json().catch(() => ({}));
          } else {
            const errorData = await deleteResponse.json().catch(() => ({ error: 'Unknown error' }));
            // Don't throw here - continue with group deletion even if vector store deletion fails
            // The vector store can be manually cleaned up later if needed
          }
        }
      } catch (openaiError) {
        // Don't throw here - continue with group deletion even if vector store deletion fails
      }
    } else {
    }

    // 11) Finally, delete the group row itself
    try {
      const { error } = await defaultSupabase
        .from('group')
        .delete()
        .eq('group_id', groupId);
      if (error) {
        throw new Error(`Failed to delete group row: ${error.message}`);
      }
    } catch (e) {
      throw e;
    }
  } catch (error) {
    throw error;
  }
}
