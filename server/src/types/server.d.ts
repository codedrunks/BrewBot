import { JSONCompatible } from "svcorelib";

interface ResponseBase {
    error: boolean;
}
export type SuccessResponse<T extends Record<string, JSONCompatible>> = ResponseBase & { error: false } & T;
export type ErrorResponse<T extends string> = ResponseBase & { error: true, message: T; };

/**
 * **HTTP status code mapping:**  
 * `success` = 200  
 * `serverError` = 500  
 * `clientError` = 400  
 */
export type RespType = "success" | "serverError" | "clientError";

export type InitResourceFunc = (app: Application) => void;
