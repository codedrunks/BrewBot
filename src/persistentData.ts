import { filesystem, JSONCompatible } from "svcorelib";
import { readFile, writeFile } from "fs-extra";


interface PersistentData
{
    /** Timestamp of when the bot last started up */
    startupTime: number;
    /** Array of the current reaction roles message IDs */
    reactionMessages: string[];
}

type DataKey = keyof PersistentData;


const dataFilePath = "./data.json";

let persistentData: {
    [key: string]: JSONCompatible
} = {};


export async function init()
{
    if(await filesystem.exists(dataFilePath))
        persistentData = JSON.parse((await readFile(dataFilePath)).toString());
    else
        await writeFile(dataFilePath, "{}");
}

/** Sets the property with the provided `key` to a new `value` */
export async function set(key: DataKey, value: JSONCompatible)
{
    persistentData[key] = value;
    await writeFile(dataFilePath, JSON.stringify(persistentData, undefined, 4));
}

/** Returns the value of the property with the provided `key` */
export function get(key: DataKey): JSONCompatible
{
    return persistentData?.[key] ?? null;
}

export default {
    init,
    get,
    set,
};
