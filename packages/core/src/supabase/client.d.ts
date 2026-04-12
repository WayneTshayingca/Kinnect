import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
export declare function initSupabase(url: string, anonKey: string): SupabaseClient<Database>;
export declare function getSupabase(): SupabaseClient<Database>;
export declare const supabase: SupabaseClient<Database, "public", "public", {
    Tables: {
        calendar_events: {
            Row: {
                all_day: boolean;
                created_at: string;
                created_by: string | null;
                description: string | null;
                end_time: string;
                family_id: string;
                id: string;
                location: string | null;
                start_time: string;
                title: string;
            };
            Insert: {
                all_day?: boolean;
                created_at?: string;
                created_by?: string | null;
                description?: string | null;
                end_time: string;
                family_id: string;
                id?: string;
                location?: string | null;
                start_time: string;
                title: string;
            };
            Update: {
                all_day?: boolean;
                created_at?: string;
                created_by?: string | null;
                description?: string | null;
                end_time?: string;
                family_id?: string;
                id?: string;
                location?: string | null;
                start_time?: string;
                title?: string;
            };
            Relationships: [{
                foreignKeyName: "calendar_events_created_by_fkey";
                columns: ["created_by"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "calendar_events_family_id_fkey";
                columns: ["family_id"];
                isOneToOne: false;
                referencedRelation: "families";
                referencedColumns: ["id"];
            }];
        };
        families: {
            Row: {
                created_at: string | null;
                id: string;
                name: string;
                primary_language: string | null;
            };
            Insert: {
                created_at?: string | null;
                id?: string;
                name: string;
                primary_language?: string | null;
            };
            Update: {
                created_at?: string | null;
                id?: string;
                name?: string;
                primary_language?: string | null;
            };
            Relationships: [];
        };
        family_members: {
            Row: {
                family_id: string;
                joined_at: string;
                role: string;
                user_id: string;
            };
            Insert: {
                family_id: string;
                joined_at?: string;
                role?: string;
                user_id: string;
            };
            Update: {
                family_id?: string;
                joined_at?: string;
                role?: string;
                user_id?: string;
            };
            Relationships: [{
                foreignKeyName: "family_members_family_id_fkey";
                columns: ["family_id"];
                isOneToOne: false;
                referencedRelation: "families";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "family_members_user_id_fkey";
                columns: ["user_id"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }];
        };
        list_items: {
            Row: {
                added_by: string | null;
                assigned_shopper: string | null;
                completed: boolean;
                completed_at: string | null;
                completed_by: string | null;
                created_at: string;
                id: string;
                list_id: string;
                notes: string | null;
                position: number;
                quantity: string | null;
                title: string;
                updated_at: string;
            };
            Insert: {
                added_by?: string | null;
                assigned_shopper?: string | null;
                completed?: boolean;
                completed_at?: string | null;
                completed_by?: string | null;
                created_at?: string;
                id?: string;
                list_id: string;
                notes?: string | null;
                position?: number;
                quantity?: string | null;
                title: string;
                updated_at?: string;
            };
            Update: {
                added_by?: string | null;
                assigned_shopper?: string | null;
                completed?: boolean;
                completed_at?: string | null;
                completed_by?: string | null;
                created_at?: string;
                id?: string;
                list_id?: string;
                notes?: string | null;
                position?: number;
                quantity?: string | null;
                title?: string;
                updated_at?: string;
            };
            Relationships: [{
                foreignKeyName: "list_items_added_by_fkey";
                columns: ["added_by"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "list_items_assigned_shopper_fkey";
                columns: ["assigned_shopper"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "list_items_completed_by_fkey";
                columns: ["completed_by"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "list_items_list_id_fkey";
                columns: ["list_id"];
                isOneToOne: false;
                referencedRelation: "lists";
                referencedColumns: ["id"];
            }];
        };
        lists: {
            Row: {
                created_at: string;
                family_id: string;
                id: string;
                name: string;
                type: string;
                updated_at: string;
            };
            Insert: {
                created_at?: string;
                family_id: string;
                id?: string;
                name?: string;
                type?: string;
                updated_at?: string;
            };
            Update: {
                created_at?: string;
                family_id?: string;
                id?: string;
                name?: string;
                type?: string;
                updated_at?: string;
            };
            Relationships: [{
                foreignKeyName: "lists_family_id_fkey";
                columns: ["family_id"];
                isOneToOne: false;
                referencedRelation: "families";
                referencedColumns: ["id"];
            }];
        };
        tasks: {
            Row: {
                assigned_to: string[] | null;
                category: string | null;
                completed: boolean | null;
                completed_at: string | null;
                completed_by: string | null;
                created_at: string | null;
                created_by: string | null;
                description: string | null;
                due_date: string | null;
                family_id: string | null;
                id: string;
                points: number | null;
                title: string;
            };
            Insert: {
                assigned_to?: string[] | null;
                category?: string | null;
                completed?: boolean | null;
                completed_at?: string | null;
                completed_by?: string | null;
                created_at?: string | null;
                created_by?: string | null;
                description?: string | null;
                due_date?: string | null;
                family_id?: string | null;
                id?: string;
                points?: number | null;
                title: string;
            };
            Update: {
                assigned_to?: string[] | null;
                category?: string | null;
                completed?: boolean | null;
                completed_at?: string | null;
                completed_by?: string | null;
                created_at?: string | null;
                created_by?: string | null;
                description?: string | null;
                due_date?: string | null;
                family_id?: string | null;
                id?: string;
                points?: number | null;
                title?: string;
            };
            Relationships: [{
                foreignKeyName: "tasks_completed_by_fkey";
                columns: ["completed_by"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "tasks_created_by_fkey";
                columns: ["created_by"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "tasks_family_id_fkey";
                columns: ["family_id"];
                isOneToOne: false;
                referencedRelation: "families";
                referencedColumns: ["id"];
            }];
        };
        responsibility_templates: {
            Row: {
                id: string;
                name: string;
                slug: string;
                icon: string;
                category: string;
                default_start_time: string | null;
                is_system: boolean;
                created_at: string;
            };
            Insert: {
                id?: string;
                name: string;
                slug: string;
                icon: string;
                category: string;
                default_start_time?: string | null;
                is_system?: boolean;
                created_at?: string;
            };
            Update: {
                id?: string;
                name?: string;
                slug?: string;
                icon?: string;
                category?: string;
                default_start_time?: string | null;
                is_system?: boolean;
                created_at?: string;
            };
            Relationships: [];
        };
        responsibility_flows: {
            Row: {
                id: string;
                family_id: string;
                title: string;
                category: string;
                template_id: string | null;
                recurrence_rule: string;
                default_assignee_id: string;
                backup_assignee_ids: string[];
                start_time: string | null;
                end_time: string | null;
                active: boolean;
                created_by: string;
                created_at: string;
            };
            Insert: {
                id?: string;
                family_id: string;
                title: string;
                category: string;
                template_id?: string | null;
                recurrence_rule: string;
                default_assignee_id: string;
                backup_assignee_ids?: string[];
                start_time?: string | null;
                end_time?: string | null;
                active?: boolean;
                created_by: string;
                created_at?: string;
            };
            Update: {
                id?: string;
                family_id?: string;
                title?: string;
                category?: string;
                template_id?: string | null;
                recurrence_rule?: string;
                default_assignee_id?: string;
                backup_assignee_ids?: string[];
                start_time?: string | null;
                end_time?: string | null;
                active?: boolean;
                created_by?: string;
                created_at?: string;
            };
            Relationships: [{
                foreignKeyName: "responsibility_flows_family_id_fkey";
                columns: ["family_id"];
                isOneToOne: false;
                referencedRelation: "families";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "responsibility_flows_template_id_fkey";
                columns: ["template_id"];
                isOneToOne: false;
                referencedRelation: "responsibility_templates";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "responsibility_flows_default_assignee_id_fkey";
                columns: ["default_assignee_id"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "responsibility_flows_created_by_fkey";
                columns: ["created_by"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }];
        };
        responsibility_occurrences: {
            Row: {
                id: string;
                flow_id: string;
                family_id: string;
                scheduled_for: string;
                scheduled_time: string | null;
                assigned_to: string;
                status: string;
                override_reason: string | null;
                completed_at: string | null;
                completed_by: string | null;
                created_at: string;
            };
            Insert: {
                id?: string;
                flow_id: string;
                family_id: string;
                scheduled_for: string;
                scheduled_time?: string | null;
                assigned_to: string;
                status?: string;
                override_reason?: string | null;
                completed_at?: string | null;
                completed_by?: string | null;
                created_at?: string;
            };
            Update: {
                id?: string;
                flow_id?: string;
                family_id?: string;
                scheduled_for?: string;
                scheduled_time?: string | null;
                assigned_to?: string;
                status?: string;
                override_reason?: string | null;
                completed_at?: string | null;
                completed_by?: string | null;
                created_at?: string;
            };
            Relationships: [{
                foreignKeyName: "responsibility_occurrences_flow_id_fkey";
                columns: ["flow_id"];
                isOneToOne: false;
                referencedRelation: "responsibility_flows";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "responsibility_occurrences_family_id_fkey";
                columns: ["family_id"];
                isOneToOne: false;
                referencedRelation: "families";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "responsibility_occurrences_assigned_to_fkey";
                columns: ["assigned_to"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "responsibility_occurrences_completed_by_fkey";
                columns: ["completed_by"];
                isOneToOne: false;
                referencedRelation: "users";
                referencedColumns: ["id"];
            }];
        };
        users: {
            Row: {
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
            };
            Insert: {
                active_family_id?: string | null;
                auth_user_id?: string | null;
                avatar_url?: string | null;
                created_at?: string | null;
                family_id?: string | null;
                id?: string;
                language_preference?: string | null;
                name: string;
                phone?: string | null;
                points?: number | null;
                push_token?: string | null;
                role?: string | null;
            };
            Update: {
                active_family_id?: string | null;
                auth_user_id?: string | null;
                avatar_url?: string | null;
                created_at?: string | null;
                family_id?: string | null;
                id?: string;
                language_preference?: string | null;
                name?: string;
                phone?: string | null;
                points?: number | null;
                push_token?: string | null;
                role?: string | null;
            };
            Relationships: [{
                foreignKeyName: "users_active_family_id_fkey";
                columns: ["active_family_id"];
                isOneToOne: false;
                referencedRelation: "families";
                referencedColumns: ["id"];
            }, {
                foreignKeyName: "users_family_id_fkey";
                columns: ["family_id"];
                isOneToOne: false;
                referencedRelation: "families";
                referencedColumns: ["id"];
            }];
        };
    };
    Views: { [_ in never]: never; };
    Functions: {
        create_family_with_user: {
            Args: {
                auth_uid: string;
                family_name: string;
                primary_lang?: string;
                user_name: string;
            };
            Returns: string;
        };
        update_responsibility_flow: {
            Args: {
                p_flow_id: string;
                p_title: string;
                p_category: string;
                p_recurrence_rule: string;
                p_default_assignee_id: string;
                p_start_time: string | null;
                p_end_time?: string | null;
            };
            Returns: undefined;
        };
        get_my_families: {
            Args: never;
            Returns: {
                family_id: string;
                family_name: string;
                is_active: boolean;
                role: string;
            }[];
        };
        get_my_family_id: {
            Args: never;
            Returns: string;
        };
        switch_active_family: {
            Args: {
                target_family_id: string;
            };
            Returns: undefined;
        };
    };
    Enums: { [_ in never]: never; };
    CompositeTypes: { [_ in never]: never; };
}, {
    PostgrestVersion: "14.1";
}>;
//# sourceMappingURL=client.d.ts.map