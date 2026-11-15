export const spotifyTop100 = "https://open.spotify.com/playlist/7Ku4Aze53dlh9nbYIvQw8o";
export const spotifyGlobal50 = "https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF";

export function spotifyInvite(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 512) return;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.port || url.username || url.password)
      return;
    if (
      (url.hostname === "spotify.link" && /^\/[\w-]+\/?$/.test(url.pathname)) ||
      (url.hostname === "open.spotify.com" && /^\/(?:intl-[a-z-]+\/)?jam\/[\w-]+\/?$/i.test(url.pathname))
    ) {
      url.hash = "";
      return url.href;
    }
  } catch {
    return;
  }
}
