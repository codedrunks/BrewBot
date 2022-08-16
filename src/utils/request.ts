import _axios from "axios";

export const axios = _axios.create({
    timeout: 1000 * 15,
});

/** Follows redirects of a `url` and returns the final URL */
export async function followRedirects(url: string): Promise<string | null>
{
    try
    {
        const { request } = await axios.get(url);

        return request?.res?.responseUrl ?? null;
    }
    catch(err)
    {
        return null;
    }
}
