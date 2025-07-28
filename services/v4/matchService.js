/**
 * Glob-style pattern matcher for Rhex record types.
 * Supports:
 * - Exact matches (e.g. "scope:create")
 * - Wildcards (e.g. "scope:*", "trait:*", "*")
 */

export const Match = {
    rhex(recordType, pattern) {
        if (pattern === "*") return true;
        if (!pattern.includes("*")) return recordType === pattern;

        // Escape regex specials, then replace wildcard
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace("*", ".*");

        const regex = new RegExp(`^${escaped}$`);
        return regex.test(recordType);
    },
};
