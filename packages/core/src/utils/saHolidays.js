/** Anonymous Gregorian algorithm — returns Easter Sunday for the given year */
function getEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
}
function fmt(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
export function getSAHolidays(year) {
    const easter = getEaster(year);
    const goodFriday = new Date(easter.getTime() - 2 * 86400000);
    const familyDay = new Date(easter.getTime() + 1 * 86400000);
    const fixed = [
        { name: "New Year's Day", month: 1, day: 1 },
        { name: 'Human Rights Day', month: 3, day: 21 },
        { name: 'Freedom Day', month: 4, day: 27 },
        { name: "Workers' Day", month: 5, day: 1 },
        { name: 'Youth Day', month: 6, day: 16 },
        { name: "National Women's Day", month: 8, day: 9 },
        { name: 'Heritage Day', month: 9, day: 24 },
        { name: 'Day of Reconciliation', month: 12, day: 16 },
        { name: 'Christmas Day', month: 12, day: 25 },
        { name: 'Day of Goodwill', month: 12, day: 26 },
    ];
    const used = new Set();
    const holidays = [];
    for (const { name, month, day } of fixed) {
        let d = new Date(year, month - 1, day);
        // Sunday rule: observed on the following Monday
        if (d.getDay() === 0)
            d = new Date(d.getTime() + 86400000);
        // Resolve clashes (e.g. Christmas Sun→Mon26 collides with Day of Goodwill Mon26)
        let str = fmt(d);
        while (used.has(str)) {
            d = new Date(d.getTime() + 86400000);
            str = fmt(d);
        }
        used.add(str);
        holidays.push({ name, date: str });
    }
    // Easter-based: Good Friday (Fri) and Family Day (Mon) never land on Sunday
    holidays.push({ name: 'Good Friday', date: fmt(goodFriday) });
    holidays.push({ name: 'Family Day', date: fmt(familyDay) });
    return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
