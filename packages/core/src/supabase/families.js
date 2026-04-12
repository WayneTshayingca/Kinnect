import { getSupabase } from './client';
export async function createFamily(name, primaryLanguage = 'en') {
    const supabase = getSupabase();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser)
        throw new Error('Not authenticated');
    const userName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
    const { data: familyId, error } = await supabase.rpc('create_family_with_user', {
        family_name: name,
        auth_uid: authUser.id,
        user_name: userName,
        primary_lang: primaryLanguage,
    });
    if (error)
        throw error;
    if (!familyId)
        throw new Error('Failed to create family');
    const { data: family, error: fetchError } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();
    if (fetchError)
        throw fetchError;
    return family;
}
export async function getMyFamilies() {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_my_families');
    if (error)
        throw error;
    return data || [];
}
export async function switchActiveFamily(familyId) {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('switch_active_family', {
        target_family_id: familyId,
    });
    if (error)
        throw error;
}
export async function addFamilyMember(familyId, name, role) {
    const supabase = getSupabase();
    // Create the user record (family_id set for legacy compat + RLS on insert)
    const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
        family_id: familyId,
        active_family_id: familyId,
        name,
        role,
    })
        .select()
        .single();
    if (userError)
        throw userError;
    // Add to family_members junction table
    const { error: memberError } = await supabase
        .from('family_members')
        .insert({ family_id: familyId, user_id: user.id, role });
    if (memberError)
        throw memberError;
    return user;
}
export async function getFamily(familyId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();
    if (error)
        throw error;
    return data;
}
export async function getFamilyMembers(familyId) {
    const supabase = getSupabase();
    // Query through family_members so multi-family members are included
    const { data, error } = await supabase
        .from('family_members')
        .select('users(*)')
        .eq('family_id', familyId)
        .order('joined_at', { ascending: true });
    if (error)
        throw error;
    return (data || []).map((row) => row.users).filter(Boolean);
}
export async function updateFamily(familyId, updates) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('families')
        .update(updates)
        .eq('id', familyId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
export async function updateFamilyMember(memberId, updates) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', memberId)
        .select()
        .single();
    if (error)
        throw error;
    // Keep family_members.role in sync if role is being updated
    if (updates.role) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
            const { data: currentUser } = await supabase
                .from('users')
                .select('active_family_id')
                .eq('auth_user_id', authUser.id)
                .maybeSingle();
            if (currentUser?.active_family_id) {
                await supabase
                    .from('family_members')
                    .update({ role: updates.role })
                    .eq('user_id', memberId)
                    .eq('family_id', currentUser.active_family_id);
            }
        }
    }
    return data;
}
export async function removeFamilyMember(memberId) {
    const supabase = getSupabase();
    // Safety: prevent removing yourself
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        const { data: selfRecord } = await supabase
            .from('users')
            .select('id, active_family_id')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();
        if (selfRecord && selfRecord.id === memberId) {
            throw new Error('You cannot remove yourself from the family');
        }
        // Remove from family_members for the active family only
        if (selfRecord?.active_family_id) {
            const { error: memberError } = await supabase
                .from('family_members')
                .delete()
                .eq('user_id', memberId)
                .eq('family_id', selfRecord.active_family_id);
            if (memberError)
                throw memberError;
        }
    }
    // If the member has no auth account (dependent/observer), delete their user record entirely
    const { data: member } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('id', memberId)
        .maybeSingle();
    if (member && !member.auth_user_id) {
        const { error } = await supabase.from('users').delete().eq('id', memberId);
        if (error)
            throw error;
    }
}
