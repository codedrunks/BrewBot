import { getEnvVar } from "./util";

/**
 * Returns the auth tokens as a Set  
 * Note: Lookups in Sets (`O(1)`) are faster than in Arrays (`O(n)`) - [source](https://www.tech-hour.com/javascript-performance-and-optimization)
 */
export function getAuthTokens() {
    const tokens = getEnvVar("AUTH_TOKENS", "stringArray");
    return new Set<string>(tokens ?? []);
}
