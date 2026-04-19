import AsyncStorage from '@react-native-async-storage/async-storage'
import { initSupabase } from '@kinnect/core'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = initSupabase(supabaseUrl, supabaseAnonKey, {
  storage: AsyncStorage,
})
