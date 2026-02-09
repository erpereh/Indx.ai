/**
 * Clean duplicate names (e.g., "Fund NameFund Name" → "Fund Name")
 */
export function cleanDuplicateName(name: string): string {
    if (!name) return name;
    
    const len = name.length;
    
    // Try to find if the string is duplicated (first half = second half)
    for (let i = 1; i <= len / 2; i++) {
        const firstPart = name.substring(0, i);
        const secondPart = name.substring(i, i * 2);
        
        if (firstPart === secondPart && i * 2 === len) {
            // Found exact duplication
            return firstPart;
        }
    }
    
    return name;
}
