import { filesystem } from "svcorelib";
import { readFile, watch, writeFile } from "fs-extra";
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
    const t = Date.now();

    if(await filesystem.exists(dataFilePath))
        persistentData = await readPersistentData();
    else
        await writePersistentData(defaultData);

    await set("startupTime", t);

    watch(dataFilePath, async () => {
        persistentData = await readPersistentData();
    });
}

/** Sets the property with the provided `key` to a new `value` */
export async function set<T extends DataKey>(key: T, value: PersistentData[T])
{
    persistentData[key] = value;
    await writePersistentData(persistentData);
}

/** Returns the value of the property with the provided `key` */
export function get<T extends DataKey>(key: T): PersistentData[T] | null
{
    return persistentData?.[key] ?? null;
}

/** Reloads the persistent data stored in memory with the content of `./data.json` */
export async function reload()
{
    persistentData = await readPersistentData();
}

async function writePersistentData(data: PersistentData | Partial<PersistentData>)
{
    return await writeFile(dataFilePath, JSON.stringify(data, undefined, 4));
}

async function readPersistentData()
{
    return JSON.parse((await readFile(dataFilePath)).toString());
}

export default {
    init,
    get,
    set,
    reload,
};
