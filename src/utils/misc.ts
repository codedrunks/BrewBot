/** Truncates a string if it exceeds `length` and inserts `endStr` at the end (empty string to disable) */
export function truncStr(str: string, length: number, endStr = "...")
{
    return str.length > length ? str.substring(0, length) + endStr : str;
}

export function truncField(content: string, endStr = "...")
{
    return truncStr(content, 1024 - endStr.length, endStr);
}

/**
 * Automatically appends an `s` to the passed `word`, if `num` is not equal to 1
 * @param word A word in singular form, to auto-convert to plural
 * @param num If this is an array, the amount of items is used
 */
export function autoPlural(word: string, num: number | unknown[])
{
    if(Array.isArray(num))
        num = num.length;
    return `${word}${num === 1 ? "" : "s"}`;
}
