/** Browser helper for the teaching and review pages: sends JSON and returns the parsed result, never throwing. */
export async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(url, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined }).catch(() => null);
  if (!res) return { ok: false, status: 0, json: { error: "Couldn't reach the server. Check your connection and try again." } };
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}
