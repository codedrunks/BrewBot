/** Truncates a string if it exceeds `length` and inserts `endStr` at the end (empty string to disable) */
export function truncStr(str: string, length: number, endStr = "...")
{
    return str.length > length ? str.substring(0, length) + endStr : str;
}

export function truncField(content: string, endStr = "...")
{
    return truncStr(content, 1024 - endStr.length, endStr);
}
