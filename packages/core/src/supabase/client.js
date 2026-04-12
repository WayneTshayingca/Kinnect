import { createClient } from '@supabase/supabase-js';
let supabaseClient = null;
export function initSupabase(url, anonKey) {
    if (!supabaseClient) {
        supabaseClient = createClient(url, anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
        });
        // Keep the Realtime client's JWT in sync with the auth session.
        // Without this, presence/broadcast channels time out because the
        // WebSocket only has the anon key, not the user's access token.
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            supabaseClient?.realtime.setAuth(session?.access_token ?? null);
        });
    }
    return supabaseClient;
}
export function getSupabase() {
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized. Call initSupabase first.');
    }
    return supabaseClient;
}
// Export a typed client directly
export const supabase = new Proxy({}, {
    get(_target, prop) {
        return getSupabase()[prop];
    }
});
