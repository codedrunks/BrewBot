import _axios from "axios";

/** Default preconfigured axios instance */
export const axios = _axios.create({
    timeout: 1000 * 15,
});

/** Follows redirects of a `url` and returns the final URL */
export async function followRedirects(url: string): Promise<string | null>
{
    try
    {
        new URL(url);

        const { request } = await axios.get(url);

        return request?.res?.responseUrl ?? null;
    }
    catch(err)
    {
        return null;
    }
}
