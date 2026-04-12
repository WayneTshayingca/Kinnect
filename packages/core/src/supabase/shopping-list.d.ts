import type { List, ListItem } from '../types/database';
export interface ShoppingListData {
    list: List;
    items: ListItem[];
    totalCount: number;
}
export declare function getShoppingList(familyId: string): Promise<ShoppingListData>;
export declare function getShoppingListPreview(familyId: string, limit?: number): Promise<ShoppingListData>;
export declare function getFullShoppingList(familyId: string): Promise<{
    list: List;
    incompleteItems: ListItem[];
    completedItems: ListItem[];
}>;
export declare function addShoppingListItem(familyId: string, userId: string, data: {
    title: string;
    quantity?: string;
    notes?: string;
}): Promise<ListItem>;
export declare function toggleShoppingListItem(itemId: string, completed: boolean, userId: string): Promise<ListItem>;
export declare function updateShoppingListItem(itemId: string, data: {
    title: string;
}): Promise<ListItem>;
export declare function deleteShoppingListItem(itemId: string): Promise<void>;
export declare function clearCompletedItems(familyId: string): Promise<void>;
export declare function ensureShoppingList(familyId: string): Promise<List>;
//# sourceMappingURL=shopping-list.d.ts.map