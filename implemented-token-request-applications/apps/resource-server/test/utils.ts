import app from "../src";

export const fetchTestApplication = async (path: string, requestHeaders?: RequestInit) => {
    const request = new Request(`http://localhost${path}`, {
        ...requestHeaders,
    })
    return await app.fetch(request)
}