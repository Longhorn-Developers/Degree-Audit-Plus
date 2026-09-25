// One job at a time; later jobs wait for earlier ones. A failed job only
// fails its own caller, the next job still runs.
export interface SerialQueue {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export function createSerialQueue(): SerialQueue {
  let last: Promise<unknown> = Promise.resolve();
  return {
    run(work) {
      const turn = last.catch(() => undefined).then(work);
      last = turn;
      return turn;
    },
  };
}
