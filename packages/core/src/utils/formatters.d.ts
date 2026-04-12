/** Returns a date as a local YYYY-MM-DD string (no UTC shift). */
export declare function toLocaleDateStr(date: Date): string;
/** Returns today's date as a local YYYY-MM-DD string. */
export declare function getTodayStr(): string;
/** "Sun, Jan 15" */
export declare function formatEventDate(dateStr: string): string;
/** "2:30 PM" */
export declare function formatEventTime(dateStr: string): string;
/** "just now", "3m ago", "2h ago", "5d ago" */
export declare function timeAgo(dateStr: string): string;
//# sourceMappingURL=formatters.d.ts.map