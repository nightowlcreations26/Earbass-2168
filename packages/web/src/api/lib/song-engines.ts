import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Provider } from "../database/schema";

/* ---------- key encryption (AES-256-GCM, key derived from the auth secret) ---------- */

const KEY = createHash("sha256")
  .update(`${process.env.BETTER_AUTH_SECRET ?? ""}:earbass-provider-keys`)
  .digest();

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(packed: string) {
  const [iv, tag, enc] = packed.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/* ---------- provider metadata ---------- */

export const PROVIDER_INFO: Record<Provider, { name: string; model: string; maxSeconds: number; keyUrl: string; fields: string[] }> = {
  elevenlabs: { name: "ElevenLabs", model: "Eleven Music", maxSeconds: 180, keyUrl: "https://elevenlabs.io/app/settings/api-keys", fields: ["API key"] },
  replicate: { name: "Replicate", model: "Meta MusicGen", maxSeconds: 180, keyUrl: "https://replicate.com/account/api-tokens", fields: ["API token"] },
  stability: { name: "Stability AI", model: "Stable Audio 2.5", maxSeconds: 180, keyUrl: "https://platform.stability.ai/account/keys", fields: ["API key"] },
  mubert: { name: "Mubert", model: "Mubert Music API", maxSeconds: 180, keyUrl: "https://mubert.com/api", fields: ["Customer ID", "Access token"] },
};

/** Secret stored per provider. Mubert needs a customer-id + access-token pair. */
export type ProviderSecret = { key: string; customerId?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function download(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Couldn't download the generated audio (${r.status}).`);
  return new Uint8Array(await r.arrayBuffer());
}

async function fail(provider: string, res: Response): Promise<never> {
  const body = (await res.text()).slice(0, 220);
  if (res.status === 401 || res.status === 403) throw new Error(`${provider} rejected the key (${res.status}). Check it's valid and has music access.`);
  if (res.status === 402 || res.status === 429) throw new Error(`${provider} says you're out of credits or rate-limited (${res.status}).`);
  throw new Error(`${provider} error ${res.status}: ${body}`);
}

/* ---------- key validation ---------- */

export async function validateKey(provider: Provider, s: ProviderSecret): Promise<void> {
  let res: Response;
  switch (provider) {
    case "elevenlabs": {
      res = await fetch("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": s.key } });
      // Scoped keys without user_read still work for music — accept "missing_permissions".
      if (!res.ok && !(res.status === 401 && (await res.clone().text()).includes("missing_permissions"))) return fail("ElevenLabs", res);
      return;
    }
    case "replicate":
      res = await fetch("https://api.replicate.com/v1/account", { headers: { Authorization: `Bearer ${s.key}` } });
      if (!res.ok) return fail("Replicate", res);
      return;
    case "stability":
      res = await fetch("https://api.stability.ai/v1/user/account", { headers: { Authorization: `Bearer ${s.key}` } });
      if (!res.ok) return fail("Stability AI", res);
      return;
    case "mubert":
      if (!s.customerId) throw new Error("Mubert needs both a customer ID and an access token.");
      res = await fetch("https://music-api.mubert.com/api/v3/public/playlists", { headers: { "customer-id": s.customerId, "access-token": s.key } });
      if (!res.ok) return fail("Mubert", res);
      return;
  }
}

/* ---------- generation: returns mp3 bytes ---------- */

export async function generateWith(provider: Provider, s: ProviderSecret, prompt: string, seconds: number): Promise<Uint8Array> {
  switch (provider) {
    case "elevenlabs": {
      const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
        method: "POST",
        headers: { "xi-api-key": s.key, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, music_length_ms: seconds * 1000, model_id: "music_v1" }),
      });
      if (!res.ok) return fail("ElevenLabs", res);
      return new Uint8Array(await res.arrayBuffer());
    }

    case "stability": {
      const form = new FormData();
      form.set("prompt", prompt);
      form.set("duration", String(Math.min(seconds, 190)));
      form.set("output_format", "mp3");
      form.set("model", "stable-audio-2.5");
      const res = await fetch("https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio", {
        method: "POST",
        headers: { Authorization: `Bearer ${s.key}`, Accept: "audio/*", "stability-client-id": "earbass" },
        body: form,
      });
      if (!res.ok) return fail("Stability AI", res);
      return new Uint8Array(await res.arrayBuffer());
    }

    case "replicate": {
      const auth = { Authorization: `Bearer ${s.key}` };
      const m = await fetch("https://api.replicate.com/v1/models/meta/musicgen", { headers: auth });
      if (!m.ok) return fail("Replicate", m);
      const version = ((await m.json()) as { latest_version?: { id: string } }).latest_version?.id;
      if (!version) throw new Error("Replicate: couldn't find the MusicGen model version.");
      const res = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json", Prefer: "wait=60" },
        body: JSON.stringify({
          version,
          input: { prompt, duration: seconds, model_version: "stereo-large", output_format: "mp3", normalization_strategy: "loudness" },
        }),
      });
      if (!res.ok) return fail("Replicate", res);
      type Pred = { status: string; output?: string | string[] | null; error?: string | null; urls: { get: string } };
      let p = (await res.json()) as Pred;
      const deadline = Date.now() + 9 * 60_000;
      while (!["succeeded", "failed", "canceled"].includes(p.status)) {
        if (Date.now() > deadline) throw new Error("Replicate took too long (over 9 minutes).");
        await sleep(4000);
        const r = await fetch(p.urls.get, { headers: auth });
        if (!r.ok) return fail("Replicate", r);
        p = (await r.json()) as Pred;
      }
      if (p.status !== "succeeded" || !p.output) throw new Error(`Replicate generation ${p.status}${p.error ? `: ${p.error}` : ""}`);
      return download(Array.isArray(p.output) ? p.output[0] : p.output);
    }

    case "mubert": {
      if (!s.customerId) throw new Error("Mubert needs a customer ID.");
      const headers = { "customer-id": s.customerId, "access-token": s.key, "Content-Type": "application/json" };
      const base = "https://music-api.mubert.com/api/v3/public/tracks";
      const res = await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: prompt.slice(0, 255), duration: seconds, format: "mp3", bitrate: 320, intensity: "high", mode: "track" }),
      });
      if (!res.ok) return fail("Mubert", res);
      type Track = { id: string; generations?: { status: string; url: string | null }[] };
      const track = ((await res.json()) as { data: Track }).data;
      const deadline = Date.now() + 9 * 60_000;
      while (Date.now() < deadline) {
        await sleep(4000);
        const r = await fetch(`${base}/${track.id}`, { headers });
        if (!r.ok) return fail("Mubert", r);
        const g = ((await r.json()) as { data: Track }).data.generations?.[0];
        if (g?.status === "failed") throw new Error("Mubert generation failed.");
        if (g?.status === "done" && g.url) return download(g.url);
      }
      throw new Error("Mubert took too long (over 9 minutes).");
    }
  }
}
