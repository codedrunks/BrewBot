import { filesystem } from "svcorelib";
import { readFile, writeFile } from "fs-extra";
import { PersistentData, DataKey } from "./types";


const defaultData: Partial<PersistentData> = {
    botLogs: {
        guild: "693878197107949572", // BAC
        channel: "696108019146293360", // #bot-logs
    },
};


const dataFilePath = "./data.json";

let persistentData: Partial<PersistentData> = defaultData;


export async function init()
{
    // TODO: listen for file changes to re-read the file at runtime

    if(await filesystem.exists(dataFilePath))
        persistentData = JSON.parse((await readFile(dataFilePath)).toString());
    else
        await writeFile(dataFilePath, JSON.stringify(defaultData, undefined, 4));
}

/** Sets the property with the provided `key` to a new `value` */
export async function set<T extends DataKey>(key: T, value: PersistentData[T])
{
    persistentData[key] = value;
    await writeFile(dataFilePath, JSON.stringify(persistentData, undefined, 4));
}

/** Returns the value of the property with the provided `key` */
export function get<T extends DataKey>(key: T): PersistentData[T] | null
{
    return persistentData?.[key] ?? null;
}

export default {
    init,
    get,
    set,
};
