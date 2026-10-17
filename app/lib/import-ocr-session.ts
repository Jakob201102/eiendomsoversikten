export type ImportOcrSession<T> = { read: (input: T) => Promise<string>; dispose: () => Promise<void> };

/** Load a language model once per import, with one safe queue for the worker. */
export function createImportOcrSession<T>(factory: () => Promise<{ read: (input: T) => Promise<string>; terminate: () => Promise<unknown> }>): ImportOcrSession<T> {
  let worker: ReturnType<typeof factory> | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let disposed = false;
  return {
    read(input) {
      const task = queue.then(async () => {
        if (disposed) throw new Error("Import analysis finished");
        worker ||= factory();
        return (await worker).read(input);
      });
      queue = task.catch(() => undefined);
      return task;
    },
    async dispose() {
      await queue;
      disposed = true;
      try { if (worker) await (await worker).terminate(); } catch { /* Cleanup must not discard imported facts. */ }
    },
  };
}
