import type { Task } from '../types/database';
export interface CreateTaskInput {
    family_id: string;
    title: string;
    created_by: string;
    description?: string;
    assigned_to?: string[];
    points?: number;
    due_date?: string;
    category?: string;
}
export declare function getTasks(familyId: string): Promise<Task[]>;
export declare function getTodaysTasks(familyId: string): Promise<Task[]>;
export declare function createTask(input: CreateTaskInput): Promise<{
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
}>;
export declare function updateTask(taskId: string, updates: {
    title?: string;
    description?: string | null;
    assigned_to?: string[] | null;
    due_date?: string | null;
    points?: number | null;
    category?: string | null;
}): Promise<{
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
}>;
export declare function completeTask(taskId: string, userId: string): Promise<{
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
}>;
export declare function uncompleteTask(taskId: string): Promise<{
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
}>;
export declare function assignTask(taskId: string, userIds: string[]): Promise<{
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
}>;
export declare function deleteTask(taskId: string): Promise<void>;
//# sourceMappingURL=tasks.d.ts.map