/* eslint-disable @typescript-eslint/no-explicit-any */

import { CommandInteraction } from "discord.js";

export type HandlerFunction = (err: any, interaction: CommandInteraction | null) => void;

export function TryCatchMethod(handler: HandlerFunction) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const wrappedMethod = descriptor.value;

        descriptor.value = function(...args: any[]) {
            const interaction = args[0];
            const isInteractionType = interaction instanceof CommandInteraction;

            try {
                const result = wrappedMethod.apply(this, args);

                if(result && result instanceof Promise) {
                    return result.catch((err: any) => handler(err, isInteractionType ? interaction : null));
                }

                return result;
            } catch(err) {
                handler(err, isInteractionType ? interaction : null);
            }
        };

        return descriptor;
    };
}
