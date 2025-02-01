import { API_URL } from "./endpoints"

export function GetWebsocketURL() {
    const url = URL.parse(API_URL)
    if (!url) throw new Error("Failed to parse API_URL: " + API_URL)

    let proto = "wss:"
    if (url.protocol === "http:") {
        proto = "ws:"
    }
    return `${proto}//${url.host}/ws`
}
