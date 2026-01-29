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
      console.error('Error searching users:', error);
      throw new Error(`Failed to search users: ${error.message}`);
    }

    return data as User[] || [];
  } catch (error) {
    console.error('Failed to search users:', error);
    throw error;
  }
}

/**
 * Create a new group in the database
 */
export async function createGroup(groupData: CreateGroupData): Promise<Group> {
  try {
    console.log('Creating group in database:', {
      group_id: groupData.group_id,
      name: groupData.name,
      administrator: groupData.administrator,
      users: groupData.users
    });

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
      console.error('❌ Supabase error creating group:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      throw new Error(`Failed to create group: ${error.message} (Code: ${error.code})`);
    }

    if (!data) {
      console.error('❌ No data returned from group creation');
      throw new Error('Group creation succeeded but no data was returned');
    }

    console.log('✅ Group created successfully in database:', data);

    // After the group is created in Supabase, optionally create a dedicated OpenAI vector store
    // and save its ID to the group's vector_store_id column, BUT ONLY if openai_chat is enabled.
    if (groupData.openai_chat) {
      console.log('ℹ️ [Group] openai_chat=true for this group, attempting to create OpenAI vector store');
      try {
        const openaiApiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
        if (!openaiApiKey) {
          console.warn('⚠️ [Group] VITE_OPENAI_API_KEY not found; skipping OpenAI vector store creation');
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
          console.log('📦 [Group] Creating OpenAI vector store for group:', {
            groupId: groupData.group_id,
            name: vectorStoreName
          });

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

          console.log('📊 [Group] OpenAI vector store response status:', response.status, response.statusText);

          if (response.ok) {
            const vsData = await response.json();
            const vectorStoreId = vsData?.id;
            console.log('✅ [Group] OpenAI vector store created:', {
              id: vectorStoreId,
              name: vsData?.name,
              status: vsData?.status
            });

            if (vectorStoreId) {
              const { error: updateError } = await defaultSupabase
                .from('group')
                .update({ vector_store_id: vectorStoreId })
                .eq('group_id', groupData.group_id);

              if (updateError) {
                console.error('❌ [Group] Failed to save vector_store_id to group:', updateError);
              } else {
                console.log('💾 [Group] Saved vector_store_id to group:', vectorStoreId);
                // Also reflect this in the returned group object
                (data as any).vector_store_id = vectorStoreId;
              }
            } else {
              console.warn('⚠️ [Group] OpenAI vector store response missing id field:', vsData);
            }
          } else {
            const errorText = await response.text();
            let errorJson: any;
            try {
              errorJson = JSON.parse(errorText);
            } catch {
              errorJson = { error: errorText };
            }
            console.error('❌ [Group] Failed to create OpenAI vector store:', errorJson);
          }
        }
      } catch (openaiError) {
        console.error('❌ [Group] Error while creating OpenAI vector store:', openaiError);
        // Do not throw here; group creation in Supabase has already succeeded
      }
    } else {
      console.log('ℹ️ [Group] openai_chat is false; skipping OpenAI vector store creation');
    }

    return data as Group;
  } catch (error) {
    console.error('❌ Failed to create group:', error);
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
      console.error('Error fetching users:', fetchError);
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
        console.error(`Error updating user ${user.user_id}:`, updateError);
        throw new Error(`Failed to update user groups: ${updateError.message}`);
      }
    });

    await Promise.all(updatePromises);
    console.log('✅ User groups updated successfully');
  } catch (error) {
    console.error('Failed to update user groups:', error);
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
      console.error('Error fetching user data:', userError);
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
      console.error('Error fetching groups:', groupsError);
      throw new Error(`Failed to fetch groups: ${groupsError.message}`);
    }

    return groups as Group[] || [];
  } catch (error) {
    console.error('Failed to fetch user groups:', error);
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
      console.error('Error fetching group:', error);
      throw new Error(`Failed to fetch group: ${error.message}`);
    }

    return data as Group;
  } catch (error) {
    console.error('Failed to fetch group:', error);
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
      console.error('Error updating group name:', error);
      throw new Error(`Failed to update group name: ${error.message}`);
    }

    console.log('✅ Group name updated successfully');
  } catch (error) {
    console.error('Failed to update group name:', error);
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
      console.error('Error fetching users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data as User[] || [];
  } catch (error) {
    console.error('Failed to fetch users:', error);
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
      console.error('Error updating group users:', error);
      throw new Error(`Failed to update group users: ${error.message}`);
    }

    console.log('✅ Group users updated successfully');
  } catch (error) {
    console.error('Failed to update group users:', error);
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
      console.error('Error updating group chunking options:', error);
      throw new Error(`Failed to update group chunking options: ${error.message}`);
    }

    console.log('✅ Group chunking options updated successfully');
  } catch (error) {
    console.error('Failed to update group chunking options:', error);
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
      console.error('Error updating group top_k:', error);
      throw new Error(`Failed to update group top_k: ${error.message}`);
    }

    console.log('✅ Group top_k updated successfully');
  } catch (error) {
    console.error('Failed to update group top_k:', error);
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
      console.error('Error updating group openai_chat:', error);
      throw new Error(`Failed to update group openai_chat: ${error.message}`);
    }

    console.log('✅ Group openai_chat updated successfully');
  } catch (error) {
    console.error('Failed to update group openai_chat:', error);
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
    console.log('🗑️ [Group] Starting deleteGroupAndAllData for group:', groupId);

    // 1) Load group to get users array, openai_chat, and vector_store_id
    const { data: groupData, error: groupError } = await defaultSupabase
      .from('group')
      .select('group_id, name, users, openai_chat, vector_store_id')
      .eq('group_id', groupId)
      .maybeSingle();

    if (groupError) {
      console.error('❌ [Group] Failed to fetch group before delete:', groupError);
      throw new Error(`Failed to fetch group before delete: ${groupError.message}`);
    }

    if (!groupData) {
      console.warn('⚠️ [Group] Group not found, nothing to delete:', groupId);
      return;
    }

    console.log('📋 [Group] Deleting group and related data for:', {
      group_id: groupData.group_id,
      name: groupData.name,
      usersCount: Array.isArray(groupData.users) ? groupData.users.length : 0,
    });

    // 2) Remove group_id from all users' groups arrays (if any)
    const groupUsers: string[] = Array.isArray(groupData.users) ? groupData.users : [];
    if (groupUsers.length > 0) {
      console.log(`👥 [Group] Removing group_id from ${groupUsers.length} user(s) groups arrays`);
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
              console.warn(`⚠️ [Group] Failed to update user ${userId} groups array:`, updateUserError);
            }
          }
        } catch (userUpdateError) {
          console.warn(`⚠️ [Group] Error updating user ${userId} groups array:`, userUpdateError);
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
        console.error('❌ [Group] Failed to delete admin_feedback rows:', error);
        throw new Error(`Failed to delete admin_feedback rows: ${error.message}`);
      }
      console.log('🧹 [Group] Deleted admin_feedback rows for group:', groupId);
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
        console.error('❌ [Group] Failed to delete user_feedback rows:', error);
        throw new Error(`Failed to delete user_feedback rows: ${error.message}`);
      }
      console.log('🧹 [Group] Deleted user_feedback rows for group:', groupId);
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
        console.error('❌ [Group] Failed to delete chat rows:', error);
        throw new Error(`Failed to delete chat rows: ${error.message}`);
      }
      console.log('🧹 [Group] Deleted chat rows for group:', groupId);
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
        console.error('❌ [Group] Failed to delete session rows:', error);
        throw new Error(`Failed to delete session rows: ${error.message}`);
      }
      console.log('🧹 [Group] Deleted session rows for group:', groupId);
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
        console.error('❌ [Group] Failed to delete files rows:', error);
        throw new Error(`Failed to delete files rows: ${error.message}`);
      }
      console.log('🧹 [Group] Deleted files rows for group:', groupId);
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
        console.error('❌ [Group] Failed to delete prompts rows:', error);
        throw new Error(`Failed to delete prompts rows: ${error.message}`);
      }
      console.log('🧹 [Group] Deleted prompts rows for group:', groupId);
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
        console.error('❌ [Group] Failed to delete documents rows:', error);
        throw new Error(`Failed to delete documents rows: ${error.message}`);
      }
      console.log('🧹 [Group] Deleted documents rows for group:', groupId);
    } catch (e) {
      throw e;
    }

    // 10) Delete OpenAI vector store and associated files if openai_chat is enabled
    if (groupData.openai_chat === true && groupData.vector_store_id) {
      try {
        console.log('🔧 [Group] OpenAI Chat enabled, deleting OpenAI vector store and files:', groupData.vector_store_id);
        
        const openaiApiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
        if (!openaiApiKey) {
          console.warn('⚠️ [Group] VITE_OPENAI_API_KEY not found; skipping OpenAI vector store deletion');
        } else {
          const vectorStoreId = groupData.vector_store_id;
          
          // Step 1: Get list of files in the vector store
          console.log(`📋 [Group] Fetching files from OpenAI vector store: ${vectorStoreId}`);
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
            console.log(`📁 [Group] Found ${files.length} file(s) in vector store`);
            
            // Step 2: Delete each file from OpenAI
            if (files.length > 0) {
              console.log(`🗑️ [Group] Deleting ${files.length} file(s) from OpenAI...`);
              let deletedCount = 0;
              let failedCount = 0;
              
              for (const file of files) {
                const fileId = file.id;
                if (!fileId) {
                  console.warn('⚠️ [Group] File object missing id:', file);
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
                    console.log(`✅ [Group] Deleted OpenAI file: ${fileId}`, deleteData);
                    deletedCount++;
                  } else {
                    const errorData = await deleteFileResponse.json().catch(() => ({ error: 'Unknown error' }));
                    console.error(`❌ [Group] Failed to delete OpenAI file ${fileId}:`, errorData);
                    failedCount++;
                  }
                } catch (fileError) {
                  console.error(`❌ [Group] Error deleting OpenAI file ${fileId}:`, fileError);
                  failedCount++;
                }
              }
              
              console.log(`📊 [Group] File deletion summary: ${deletedCount} deleted, ${failedCount} failed`);
            } else {
              console.log('ℹ️ [Group] No files found in vector store');
            }
          } else {
            const errorData = await listResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.warn('⚠️ [Group] Failed to list files from vector store:', errorData);
            // Continue with vector store deletion even if we couldn't list files
          }
          
          // Step 3: Delete the vector store itself
          console.log(`📤 [Group] Deleting OpenAI vector store: ${vectorStoreId}`);
          const deleteVectorStoreUrl = `https://api.openai.com/v1/vector_stores/${vectorStoreId}`;
          
          const deleteResponse = await fetch(deleteVectorStoreUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
            },
          });
          
          console.log(`📊 [Group] OpenAI vector store deletion response: ${deleteResponse.status} ${deleteResponse.statusText}`);
          
          if (deleteResponse.ok) {
            const responseData = await deleteResponse.json().catch(() => ({}));
            console.log('✅ [Group] OpenAI vector store deleted successfully:', responseData);
          } else {
            const errorData = await deleteResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('❌ [Group] Failed to delete OpenAI vector store:', errorData);
            // Don't throw here - continue with group deletion even if vector store deletion fails
            // The vector store can be manually cleaned up later if needed
          }
        }
      } catch (openaiError) {
        console.error('❌ [Group] Error deleting OpenAI vector store and files:', openaiError);
        // Don't throw here - continue with group deletion even if vector store deletion fails
      }
    } else {
      console.log('ℹ️ [Group] OpenAI Chat disabled or no vector_store_id; skipping OpenAI vector store deletion');
    }

    // 11) Finally, delete the group row itself
    try {
      const { error } = await defaultSupabase
        .from('group')
        .delete()
        .eq('group_id', groupId);
      if (error) {
        console.error('❌ [Group] Failed to delete group row:', error);
        throw new Error(`Failed to delete group row: ${error.message}`);
      }
      console.log('✅ [Group] Group deleted successfully:', groupId);
    } catch (e) {
      throw e;
    }
  } catch (error) {
    console.error('❌ [Group] deleteGroupAndAllData failed:', error);
    throw error;
  }
}
