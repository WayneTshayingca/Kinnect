import type { User } from '../types/database';
export declare function signInWithGoogle(): Promise<{
    provider: import("@supabase/auth-js").Provider;
    url: string;
} | {
    provider: import("@supabase/auth-js").Provider;
    url: null;
}>;
export declare function signUp(email: string, password: string, name: string): Promise<{
    user: import("@supabase/auth-js").User | null;
    session: import("@supabase/auth-js").Session | null;
} | {
    user: null;
    session: null;
}>;
export declare function signIn(email: string, password: string): Promise<{
    user: import("@supabase/auth-js").User;
    session: import("@supabase/auth-js").Session;
    weakPassword?: import("@supabase/auth-js").WeakPassword;
} | {
    user: null;
    session: null;
    weakPassword?: null;
}>;
export declare function signOut(): Promise<void>;
export declare function getCurrentUser(): Promise<User | null>;
export declare function changePassword(newPassword: string): Promise<{
    user: import("@supabase/auth-js").User;
} | {
    user: null;
}>;
export declare function resetPasswordForEmail(email: string, redirectTo: string): Promise<void>;
export declare function getSession(): Promise<import("@supabase/auth-js").Session>;
//# sourceMappingURL=auth.d.ts.map