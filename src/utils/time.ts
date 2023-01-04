import { ParseDurationResult, Stringifiable } from "svcorelib";

export function formatSeconds(seconds: number): string {
    const date = new Date(1970, 0, 1);
    date.setSeconds(seconds);

    return date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
}

export function nowInSeconds(): number {
    return Math.round(new Date().getTime() / 1000);
}

export function musicReadableTimeString(position: ParseDurationResult, duration: ParseDurationResult): string {
    const positionString = `${position.hrs ? (position.hrs > 10 ? `${position.hrs}:` : `0${position.hrs}`) : ""}${position.mins ? (position.mins > 10 ? `${position.mins}:` : `0${position.mins}:`) : "00:"}${position.secs ? (position.secs > 10 ? `${position.secs}` : `0${position.secs}`) : "00"}`;
    
    const durationString = `${duration.hrs ? (duration.hrs > 10 ? `${duration.hrs}:` : `0${duration.hrs}`) : ""}${duration.mins ? (duration.mins > 10 ? `${duration.mins}:` : `0${duration.mins}:`) : "00:"}${duration.secs ? (duration.secs > 10 ? `${duration.secs}` : `0${duration.secs}`) : "00"}`;

    return `${positionString}/${durationString}`;
}

/** Turns a Date instance or unix13 timestamp into a unix10 timestamp */
export function toUnix10(time: Date | number)
{
    return Math.floor((typeof time === "number" ? time : time.getTime()) / 1000);
}

export type TimeObj = Record<"days"|"hours"|"minutes"|"seconds"|"months"|"years", number>;

/** Converts a time object into its amount of milliseconds */
export function timeToMs(timeObj: Partial<TimeObj>)
{
    return Math.floor(
        1000 * (timeObj?.seconds ?? 0)
        + 1000 * 60 * (timeObj?.minutes ?? 0)
        + 1000 * 60 * 60 * (timeObj?.hours ?? 0)
        + 1000 * 60 * 60 * 24 * (timeObj?.days ?? 0)
        + 1000 * 60 * 60 * 24 * 30 * (timeObj?.months ?? 0)
        + 1000 * 60 * 60 * 24 * 365 * (timeObj?.years ?? 0)
    );
}

/**
 * Pads a passed value with leading zeroes until a length is reached. Examples:  
 * `zeroPad(9)` -> `09`  
 * `zeroPad(99)` -> `99`  
 * `zeroPad(99, 5)` -> `00099`
 * @param value Any stringifiable value to pad with zeroes
 * @param padLength The desired length to pad to - default is 2
 */
export function zeroPad(value: Stringifiable, padLength = 2) {
    return String(value).padStart(padLength, "0");
}
