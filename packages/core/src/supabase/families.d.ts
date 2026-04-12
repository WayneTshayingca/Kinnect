import type { Family, MyFamily, User } from '../types/database';
export declare function createFamily(name: string, primaryLanguage?: string): Promise<{
    created_at: string | null;
    id: string;
    name: string;
    primary_language: string | null;
}>;
export declare function getMyFamilies(): Promise<MyFamily[]>;
export declare function switchActiveFamily(familyId: string): Promise<void>;
export declare function addFamilyMember(familyId: string, name: string, role: 'admin' | 'member' | 'dependent' | 'observer'): Promise<{
    active_family_id: string | null;
    auth_user_id: string | null;
    avatar_url: string | null;
    created_at: string | null;
    family_id: string | null;
    id: string;
    language_preference: string | null;
    name: string;
    phone: string | null;
    points: number | null;
    push_token: string | null;
    role: string | null;
}>;
export declare function getFamily(familyId: string): Promise<Family | null>;
export declare function getFamilyMembers(familyId: string): Promise<User[]>;
export declare function updateFamily(familyId: string, updates: {
    name?: string;
    primary_language?: string;
}): Promise<{
    created_at: string | null;
    id: string;
    name: string;
    primary_language: string | null;
}>;
export declare function updateFamilyMember(memberId: string, updates: {
    name?: string;
    role?: string;
    phone?: string | null;
}): Promise<{
    active_family_id: string | null;
    auth_user_id: string | null;
    avatar_url: string | null;
    created_at: string | null;
    family_id: string | null;
    id: string;
    language_preference: string | null;
    name: string;
    phone: string | null;
    points: number | null;
    push_token: string | null;
    role: string | null;
}>;
export declare function removeFamilyMember(memberId: string): Promise<void>;
//# sourceMappingURL=families.d.ts.map