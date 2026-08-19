// Utilities (platform-agnostic — safe for web and React Native)
export * from './utils/formatters'
export * from './utils/constants'
export * from './utils/saHolidays'

// Supabase client
export { initSupabase, getSupabase } from './supabase/client'

// Auth
export * from './supabase/auth'

// Families
export * from './supabase/families'

// Tasks
export * from './supabase/tasks'

// Calendar
export * from './supabase/calendar'

// Shopping List
export * from './supabase/shopping-list'

// Responsibilities
export * from './supabase/responsibilities'

// Notifications
export * from './supabase/notifications'

// Types
export * from './types/database'