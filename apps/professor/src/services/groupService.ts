import { createClient } from '@supabase/supabase-js';

// Default Supabase credentials for group operations (Admin's database)
const DEFAULT_SUPABASE_URL = 'https://qpyteahuynkgkbmdasbv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY';

// Create default Supabase client for group operations
const defaultSupabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

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
}

export interface CreateGroupData {
  group_id: string;
  name: string;
  administrator: string;
  users: string[];
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
