import { Stringifiable } from "svcorelib";
import k from "kleur";
import { settings } from "@src/settings";

/** Truncates a string if it exceeds `length` and inserts `endStr` at the end (empty string to disable) */
export function truncStr(str: string, length: number, endStr = "...")
{
    return str.length > length ? str.substring(0, length) + endStr : str;
}

/** Truncates the value of an EmbedBuilder field to a max length of 1024 and inserts endStr */
export function truncField(content: string, endStr = "...")
{
    return truncStr(content, 1024 - endStr.length, endStr);
}

/**
 * Automatically appends an `"s"` to the passed `word`, if `num` (or length of num if it's an array) is not equal to 1
 * @example ```ts
 * autoPlural("bunger", 1)     // "bunger"
 * autoPlural("bunger", 2)     // "bungers"
 * autoPlural("bunger", [1,2]) // "bungers"
 * ```
 * @param word A word in singular form, to auto-convert to plural
 * @param num If this is an array, the amount of items is used
 */
export function autoPlural(word: string, num: number | unknown[])
{
    if(Array.isArray(num))
        num = num.length;
    return `${word}${num === 1 ? "" : "s"}`;
}

/**
 * Prints a styled list of items to the console
 * @param limit Max amount of items per line
 */
export function printDbgItmList(list: string[] | Stringifiable[], limit = 10)
{
    let msg = "";

    list = list.map(itm => itm.toString()).sort();

    while(list.length > 0)
    {
        const items = list.splice(0, limit);
        msg += `│ ${k.gray(`${items.join(", ")}${items.length === 8 ? "," : ""}`)}\n`;
    }

    console.log(msg);
}

/** Triggers the console bell sound if enabled in the .env */
export function ringBell()
{
    settings.debug.bellOnReady && process.stdout.write("\u0007");
}
