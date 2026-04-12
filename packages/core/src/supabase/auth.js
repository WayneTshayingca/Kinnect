import { getSupabase } from './client';
export async function signInWithGoogle() {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    });
    if (error)
        throw error;
    return data;
}
export async function signUp(email, password, name) {
    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
    });
    if (authError)
        throw authError;
    if (!authData.user)
        throw new Error('No user returned from signup');
    // Create user profile — if this fails, clean up the orphaned auth user
    const { error: profileError } = await supabase
        .from('users')
        .insert({
        auth_user_id: authData.user.id,
        name,
        role: 'admin',
    });
    if (profileError) {
        await supabase.auth.signOut().catch(() => { });
        throw new Error(`Signup failed: could not create user profile. ${profileError.message}`);
    }
    return authData;
}
export async function signIn(email, password) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error)
        throw error;
    return data;
}
export async function signOut() {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error)
        throw error;
}
export async function getCurrentUser() {
    const supabase = getSupabase();
    // getUser() validates the JWT against Supabase (network call),
    // ensuring the token hasn't been tampered with or revoked
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser)
        return null;
    const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
    if (error)
        throw error;
    return userData;
}
export async function changePassword(newPassword) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error)
        throw error;
    return data;
}
export async function resetPasswordForEmail(email, redirectTo) {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error)
        throw error;
}
export async function getSession() {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}
