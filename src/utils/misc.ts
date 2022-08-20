export function isProd()
{
    return ["prod", "production"].includes(process.env?.NODE_ENV?.toLowerCase() ?? "");
}
