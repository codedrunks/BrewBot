import { exit } from "process";
import { Stringifiable } from "svcorelib";

/**
 * Logs an error.  
 * TODO: add logging lib to this.
 * @param msg Error message that's displayed in the console
 * @param err Error instance
 * @param fatal Set to true to exit the process with code 1
 */
export function error(msg: string, err?: Error, fatal?: boolean): void
/**
 * Logs an error.  
 * TODO: add logging lib to this.
 * @param err Error instance
 * @param fatal Set to true to exit the process with code 1
 */
export function error(err: Error, fatal?: boolean): void
export function error(param1: string | Error, param2?: Error | boolean, param3?: boolean): void
{
    if(typeof param1 === "string")
    {
        // (msg: string, err?: Error, fatal?: boolean)
        const msg = param1;
        const err = param2 as Error | undefined;
        const fatal = param3 === true;

        logToConsole(msg, err);

        fatal && exit(1);
    }
    else if(param1 instanceof Error)
    {
        // (err: Error, fatal?: boolean)
        const err = param1;
        const fatal = param2 === true;

        logToConsole(err);

        fatal && exit(1);
    }
}

function logToConsole(...args: (Stringifiable | undefined)[])
{
    console.error(...(args.filter(a => a !== undefined)));
}
