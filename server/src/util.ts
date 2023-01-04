import { Response } from "express";
import dotenv from "dotenv";
import { JSONCompatible } from "svcorelib";

import { RespType } from "./types/server";

// Import order could be off so init dotenv twice to be sure
dotenv.config();

/** Grabs an environment variable's value, and casts it to a `string` - however if the string is empty (unset), undefined is returned */
export function getEnvVar(varName: string, asType?: "stringNoEmpty"): undefined | string
/** Grabs an environment variable's value, and casts it to a `string` */
export function getEnvVar(varName: string, asType?: "string"): undefined | string
/** Grabs an environment variable's value, and casts it to a `number` */
export function getEnvVar(varName: string, asType: "number"): undefined | number
/** Grabs an environment variable's value, and casts it to a `string[]` */
export function getEnvVar(varName: string, asType: "stringArray"): undefined | string[]
/** Grabs an environment variable's value, and casts it to a `number[]` */
export function getEnvVar(varName: string, asType: "numberArray"): undefined | number[]
/** Grabs an environment variable's value, and casts it to a specific type (default string) */
export function getEnvVar<T extends ("string" | "number" | "stringArray" | "numberArray")>(varName: string, asType: T = "string" as T): undefined | (string | number | string[] | number[])
{
    const val = process.env[varName];

    if(!val)
        return undefined;

    let transform: (value: string) => unknown = v => v.trim();

    const commasRegex = /[.,،，٫٬]/g;

    switch(asType)
    {
    case "number":
        transform = v => parseInt(v.trim());
        break;
    case "stringArray":
        transform = v => v.trim().split(commasRegex);
        break;
    case "numberArray":
        transform = v => v.split(commasRegex).map(n => parseInt(n.trim()));
        break;
    case "stringNoEmpty":
        transform = v => String(v).trim().length == 0 ? undefined : String(v).trim();
    }

    return transform(val) as string; // I'm lazy and ts is happy, so we can all be happy and pretend this doesn't exist
}

/**
 * Responds to a successful HTTP request with a data object
 * @param data Object with data to respond with
 */
export function respond(res: Response, data: Record<string, JSONCompatible>, type?: "success"): void
/**
 * Responds to an errored HTTP request with a reason message
 * @param data Error message
 */
export function respond(res: Response, data: string, type: "serverError" | "clientError"): void
/**
 * Responds to an HTTP request
 * @param data Object with data to respond with **OR** error message string
 * @param type Type of the response. This is what decides the status code and data structure. Default is `success`
 */
export function respond(res: Response, data: Record<string, JSONCompatible> | string, type: RespType = "success"): void {
    let error = true, status = 500, resData: Record<string, JSONCompatible>;

    switch(type) {
    case "success":
        status = 200;
        error = false;
        resData = data as Record<string, JSONCompatible>;
        break;
    case "serverError":
        status = 500;
        resData = { message: data as string };
        break;
    case "clientError":
        status = 400;
        resData = { message: data as string };
        break;
    }

    res.status(status).send({
        error,
        ...resData,
    });
}
