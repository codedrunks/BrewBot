import { ColorResolvable, CommandInteraction, MessageEmbed } from "discord.js";
import { ParseDurationResult } from "svcorelib";
import { settings } from "./settings";

const defaultColor = settings.embedColors.default;

export function embedify(text: string, color?: ColorResolvable): MessageEmbed {
    return new MessageEmbed()
        .setDescription(text).setColor(color ?? defaultColor);
}

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

/* eslint-disable */

export type HandlerFunction = (err: any, interaction?: CommandInteraction) => void;

export function TryCatchMethod(handler: HandlerFunction) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const wrappedMethod = descriptor.value;

        descriptor.value = function(...args: any[]) {
            const interaction = args[0];
            let isInteractionType: boolean;
            if(interaction instanceof CommandInteraction) isInteractionType = true;
            else isInteractionType = false;

            try {
                const result = wrappedMethod.apply(this, args);

                if(result && result instanceof Promise) {
                    return result.catch((err: any) => handler(err, isInteractionType ? interaction : null));
                }

                return result;
            } catch(err) {
                handler(err, isInteractionType ? interaction : null);
            }
        }

        return descriptor;
    };
}

/* eslint-enable */
