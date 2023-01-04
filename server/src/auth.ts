export function getAuthTokens() {
    const envVal = process.env["AUTH_TOKENS"];
    let tokens: string[] = [];

    if(!envVal || envVal.length === 0)
        tokens = [];
    else
        tokens = envVal.split(/,/g);

    return new Set<string>(tokens);
}
