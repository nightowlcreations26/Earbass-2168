import { client } from "./api";

export async function uploadFile(file: Blob, filename: string, kind: "audio" | "cover" | "avatar") {
  const contentType = file.type || (kind === "audio" ? "audio/mpeg" : "image/jpeg");
  const { url, publicUrl } = await client.me.presign({ filename, contentType, kind });
  const res = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType, "x-amz-acl": "public-read" },
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return publicUrl;
}

export function audioDuration(file: Blob) {
  return new Promise<number | undefined>((resolve) => {
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.src = URL.createObjectURL(file);
    a.onloadedmetadata = () => {
      resolve(isFinite(a.duration) ? Math.round(a.duration) : undefined);
      URL.revokeObjectURL(a.src);
    };
    a.onerror = () => resolve(undefined);
  });
}

/** In-memory hand-off between studio tools (Beat Pad → Mix Pad / Upload). */
type Clip = { name: string; blob: Blob; url: string; fromAI: boolean };
let clips: Clip[] = [];
const subs = new Set<() => void>();
export const studioBus = {
  add(c: Omit<Clip, "url">) {
    clips = [{ ...c, url: URL.createObjectURL(c.blob) }, ...clips].slice(0, 10);
    subs.forEach((f) => f());
  },
  list: () => clips,
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
  pendingUpload: null as Clip | null,
};
