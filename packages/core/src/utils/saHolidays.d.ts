export interface SAHoliday {
    name: string;
    date: string;
}
/**
 * Returns all South African public holidays for the given year.
 *
 * Fixed holidays apply the SA Sunday rule: if the holiday falls on Sunday,
 * the following Monday is observed. If two observed holidays clash (e.g.
 * Christmas → Mon 26 and Day of Goodwill also Mon 26), the later one shifts
 * to Tuesday.
 *
 * Dates are YYYY-MM-DD strings (local dates, no timezone).
 */
export declare function getSAHolidays(year: number): SAHoliday[];
//# sourceMappingURL=saHolidays.d.ts.map