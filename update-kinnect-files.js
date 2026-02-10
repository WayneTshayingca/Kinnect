const fs = require('fs');
const path = require('path');

// Update package.json
const packageJson = {
  "name": "kinnect",
  "version": "0.1.0",
  "private": true,
  "packageManager": "npm@10.2.4",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18.17.0"
  }
};

// Update turbo.json
const turboJson = {
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    },
    "clean": {
      "cache": false
    }
  }
};

// Update core tsconfig.json
const coreTsConfig = {
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "strict": false,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
};

// Database types
const databaseTypes = `// Database types based on your existing Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'parent' | 'grandparent' | 'child' | 'domestic_worker'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          family_id: string | null
          auth_user_id: string | null
          name: string
          role: UserRole | null
          phone: string | null
          avatar_url: string | null
          language_preference: string
          push_token: string | null
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          family_id?: string | null
          auth_user_id?: string | null
          name: string
          role?: UserRole | null
          phone?: string | null
          avatar_url?: string | null
          language_preference?: string
          push_token?: string | null
          points?: number
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string | null
          auth_user_id?: string | null
          name?: string
          role?: UserRole | null
          phone?: string | null
          avatar_url?: string | null
          language_preference?: string
          push_token?: string | null
          points?: number
          created_at?: string
        }
      }
      families: {
        Row: {
          id: string
          name: string
          primary_language: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          primary_language?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          primary_language?: string | null
          created_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          family_id: string | null
          title: string
          description: string | null
          assigned_to: string[] | null
          due_date: string | null
          completed: boolean | null
          completed_by: string | null
          completed_at: string | null
          points: number | null
          category: string | null
          created_by: string
          created_at: string | null
        }
        Insert: {
          id?: string
          family_id?: string | null
          title: string
          description?: string | null
          assigned_to?: string[] | null
          due_date?: string | null
          completed?: boolean | null
          completed_by?: string | null
          completed_at?: string | null
          points?: number | null
          category?: string | null
          created_by: string
          created_at?: string | null
        }
        Update: {
          id?: string
          family_id?: string | null
          title?: string
          description?: string | null
          assigned_to?: string[] | null
          due_date?: string | null
          completed?: boolean | null
          completed_by?: string | null
          completed_at?: string | null
          points?: number | null
          category?: string | null
          created_by?: string
          created_at?: string | null
        }
      }
      calendar_events: {
        Row: {
          id: string
          family_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          all_day: boolean
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          all_day?: boolean
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          created_by?: string
          created_at?: string
        }
      }
    }
  }
}

// Helper types
export type User = Database['public']['Tables']['users']['Row']
export type Family = Database['public']['Tables']['families']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
`;

// Supabase client
const supabaseClient = `import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// This will be initialized by the app with proper env variables
let supabaseClient: SupabaseClient<Database> | null = null

export function initSupabase(url: string, anonKey: string) {
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  }
  return supabaseClient
}

export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabase first.')
  }
  return supabaseClient
}

// Export types for convenience
export type { Database } from '../types/database'
`;

// Auth functions
const authFunctions = `import { getSupabase } from './client'
import type { User } from '../types/database'

export async function signUp(email: string, password: string, name: string) {
  const supabase = getSupabase()
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('No user returned from signup')

  // Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      name,
      role: 'parent', // Default role
    } as any)

  if (profileError) throw profileError

  return authData
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase()
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single()

  if (error) throw error
  return userData
}

export async function getSession() {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
`;

// Tasks functions
const tasksFunctions = `import { getSupabase } from './client'
import type { Task } from '../types/database'

export async function getTasks(familyId: string): Promise<Task[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTask(
  familyId: string,
  title: string,
  createdBy: string,
  description?: string,
  assignedTo?: string[],
  points?: number,
  dueDate?: string,
  category?: string
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      family_id: familyId,
      title,
      description,
      assigned_to: assignedTo || [],
      points: points || 10,
      due_date: dueDate,
      category,
      created_by: createdBy,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function completeTask(taskId: string, userId: string) {
  const supabase = getSupabase()
  
  // Mark task as complete
  // Note: Your database has a trigger (award_points_on_task_completion) 
  // that automatically awards points when a task is completed
  const { data: task, error: updateError } = await supabase
    .from('tasks')
    .update({ 
      completed: true,
      completed_by: userId,
      completed_at: new Date().toISOString()
    } as any)
    .eq('id', taskId)
    .select()
    .single()

  if (updateError) throw updateError

  return task
}

export async function deleteTask(taskId: string) {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}

export async function assignTask(taskId: string, userIds: string[]) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ assigned_to: userIds } as any)
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data
}
`;

// Families functions
const familiesFunctions = `import { getSupabase } from './client'
import type { Family, User } from '../types/database'

export async function createFamily(name: string, userId: string, primaryLanguage = 'en') {
  const supabase = getSupabase()
  
  // Create family
  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({ 
      name,
      primary_language: primaryLanguage
    } as any)
    .select()
    .single()

  if (familyError) throw familyError

  // Update user with family_id
  const { error: userError } = await supabase
    .from('users')
    .update({ family_id: family.id } as any)
    .eq('id', userId)

  if (userError) throw userError

  return family
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single()

  if (error) throw error
  return data
}

export async function getFamilyMembers(familyId: string): Promise<User[]> {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function addFamilyMember(
  familyId: string,
  name: string,
  role: 'parent' | 'grandparent' | 'child' | 'domestic_worker'
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      family_id: familyId,
      name,
      role,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data
}
`;

// Calendar functions
const calendarFunctions = `import { getSupabase } from './client'
import type { CalendarEvent } from '../types/database'

export async function getCalendarEvents(
  familyId: string,
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> {
  const supabase = getSupabase()
  
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('family_id', familyId)

  if (startDate) {
    query = query.gte('start_time', startDate)
  }
  if (endDate) {
    query = query.lte('start_time', endDate)
  }

  const { data, error } = await query.order('start_time', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createCalendarEvent(
  familyId: string,
  title: string,
  startTime: string,
  endTime: string,
  createdBy: string,
  description?: string,
  allDay = false
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      family_id: familyId,
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      all_day: allDay,
      created_by: createdBy,
    } as any)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCalendarEvent(
  eventId: string,
  updates: {
    title?: string
    description?: string
    start_time?: string
    end_time?: string
    all_day?: boolean
  }
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates as any)
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCalendarEvent(eventId: string) {
  const supabase = getSupabase()
  
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)

  if (error) throw error
}
`;

// Write all files
console.log('Updating files...');

// Root files
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
fs.writeFileSync('turbo.json', JSON.stringify(turboJson, null, 2));

// Core package files
fs.writeFileSync('packages/core/tsconfig.json', JSON.stringify(coreTsConfig, null, 2));
fs.writeFileSync('packages/core/src/types/database.ts', databaseTypes);
fs.writeFileSync('packages/core/src/supabase/client.ts', supabaseClient);
fs.writeFileSync('packages/core/src/supabase/auth.ts', authFunctions);
fs.writeFileSync('packages/core/src/supabase/tasks.ts', tasksFunctions);
fs.writeFileSync('packages/core/src/supabase/families.ts', familiesFunctions);
fs.writeFileSync('packages/core/src/supabase/calendar.ts', calendarFunctions);

console.log('✅ All files updated successfully!');
console.log('Now run: npm run dev');