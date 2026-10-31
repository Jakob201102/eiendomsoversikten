export type ImportImageResult<T> = {
  files: { url: string; file: T }[];
  plans: string[];
  texts: string[];
  failedDownloads: number;
  failedReads: number;
};

/** Same ordered scan limits as before; OCR overlaps the remaining downloads. */
export async function analyseImportImages<T>(urls: string[], options: {
  download: (url: string, index: number) => Promise<T>;
  isPlan: (file: T) => Promise<boolean>;
  read: (file: T) => Promise<string>;
  acceptsText: (text: string) => boolean;
  progress?: (stage: "download" | "read", index: number, total: number) => void;
}): Promise<ImportImageResult<T>> {
  const selected = urls.slice(0, 60);
  const slots: { done: boolean; file?: T; plan: boolean }[] = selected.map(() => ({ done: false, plan: false }));
  const result: ImportImageResult<T> = { files: [], plans: [], texts: [], failedDownloads: 0, failedReads: 0 };
  let next = 0;
  let prefix = 0;
  let candidates = 0;
  let readQueue = Promise.resolve();
  function releaseCompletedPrefix() {
    // A slow earlier download cannot change which first eight plans get read.
    while (prefix < slots.length && slots[prefix].done) {
      const index = prefix++;
      const slot = slots[index];
      if (!slot.file || !slot.plan || candidates >= 8) continue;
      const candidate = ++candidates;
      readQueue = readQueue.then(async () => {
        options.progress?.("read", candidate, 8);
        try {
          const text = (await options.read(slot.file!)).trim();
          if (text.length >= 5 && options.acceptsText(text)) result.texts.push(text);
        } catch { result.failedReads++; }
        result.plans.push(selected[index]);
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, selected.length) }, async () => {
    while (next < selected.length) {
      const index = next++;
      try {
        options.progress?.("download", index + 1, selected.length);
        slots[index].file = await options.download(selected[index], index);
        slots[index].plan = await options.isPlan(slots[index].file!);
      } catch { result.failedDownloads++; }
      finally { slots[index].done = true; releaseCompletedPrefix(); }
    }
  }));
  await readQueue;
  result.files = slots.flatMap((slot, index) => slot.file ? [{ url: selected[index], file: slot.file }] : []);
  return result;
}

/** Memory-only cache: no property facts, cross-account sharing or persistent blobs. */
export function createImportImageCache<T>(settings: { maxBytes: number; ttlMs: number; maxEntries: number }, now = () => Date.now()) {
  const entries = new Map<string, { expires: number; bytes: number; value: T }>();
  const purge = () => { for (const [key, entry] of entries) if (entry.expires <= now()) entries.delete(key); };
  return {
    get(key: string): T | undefined { purge(); return entries.get(key)?.value; },
    set(key: string, value: T, bytes: number) {
      purge(); entries.delete(key);
      if (bytes > settings.maxBytes) return;
      let used = [...entries.values()].reduce((sum, entry) => sum + entry.bytes, 0);
      while (entries.size && (entries.size >= settings.maxEntries || used + bytes > settings.maxBytes)) {
        const first = entries.entries().next().value!;
        used -= first[1].bytes; entries.delete(first[0]);
      }
      entries.set(key, { value, bytes, expires: now() + settings.ttlMs });
    },
    clear() { entries.clear(); },
  };
}
