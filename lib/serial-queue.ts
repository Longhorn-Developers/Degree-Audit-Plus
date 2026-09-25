// Queue used to serialize async work (primarily running audits in our case)
export interface Queue {
  run<T>(work: () => Promise<T>): Promise<T>;
}

// Creates a queue. Each call to run will wait for the previous
// job to finish
export function createQueue(): Queue {
  let last: Promise<unknown> = Promise.resolve();
  return {
    run(work) {
      const turn = last.catch(() => undefined).then(work);
      last = turn;
      return turn;
    },
  };
}

// Uses the last trick  (diagram below)
// last = resolved
//   ↓ run(A)
// last = resolved.then(A)          → A starts now
//   ↓ run(B)
// last = (...A).then(B)            → B waits on A
//   ↓ run(C)
// last = (...A.then(B)).then(C)    → C waits on B
