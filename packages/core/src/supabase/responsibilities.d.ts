import type { ResponsibilityTemplate, ResponsibilityFlow, ResponsibilityOccurrence } from '../types/database';
export type { ResponsibilityTemplate, ResponsibilityFlow, ResponsibilityOccurrence };
export interface ResponsibilityOccurrenceWithFlow extends ResponsibilityOccurrence {
    flow_title: string;
    category: string;
    icon: string | null;
    end_time: string | null;
    assignee_name: string;
    assignee_role: string | null;
}
export declare function getResponsibilityTemplates(): Promise<ResponsibilityTemplate[]>;
export interface CreateResponsibilityFlowInput {
    family_id: string;
    title: string;
    category: string;
    template_id?: string | null;
    recurrence_rule: string;
    default_assignee_id: string;
    backup_assignee_ids?: string[];
    start_time?: string | null;
    end_time?: string | null;
    created_by: string;
}
export declare function createResponsibilityFlow(input: CreateResponsibilityFlowInput): Promise<ResponsibilityFlow>;
export declare function getTodaysResponsibilities(familyId: string): Promise<ResponsibilityOccurrenceWithFlow[]>;
export declare function getWeekResponsibilities(familyId: string): Promise<ResponsibilityOccurrenceWithFlow[]>;
export declare function reassignOccurrence(occurrenceId: string, newAssigneeId: string, reason?: string): Promise<ResponsibilityOccurrence>;
export declare function completeOccurrence(occurrenceId: string, userId: string): Promise<ResponsibilityOccurrence>;
export interface UpdateResponsibilityFlowInput {
    title: string;
    category: string;
    recurrence_rule: string;
    default_assignee_id: string;
    start_time: string | null;
    end_time: string | null;
}
export declare function updateResponsibilityFlow(flowId: string, input: UpdateResponsibilityFlowInput): Promise<void>;
export declare function uncompleteOccurrence(occurrenceId: string): Promise<ResponsibilityOccurrence>;
export interface ResponsibilityFlowWithDetails extends ResponsibilityFlow {
    icon: string | null;
    assignee_name: string;
    assignee_role: string | null;
}
export declare function getResponsibilityFlows(familyId: string): Promise<ResponsibilityFlowWithDetails[]>;
export declare function deactivateFlow(flowId: string): Promise<void>;
//# sourceMappingURL=responsibilities.d.ts.map