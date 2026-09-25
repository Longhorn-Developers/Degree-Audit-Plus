import { expect, test } from "bun:test";
import { createSerialQueue } from "../../lib/serial-queue";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 1));

test("runs work one at a time, in order", async () => {
  const queue = createSerialQueue();
  const events: string[] = [];

  const first = queue.run(async () => {
    events.push("a start");
    await tick();
    events.push("a end");
    return "a";
  });
  const second = queue.run(async () => {
    events.push("b start");
    events.push("b end");
    return "b";
  });

  expect(await Promise.all([first, second])).toEqual(["a", "b"]);
  expect(events).toEqual(["a start", "a end", "b start", "b end"]);
});

test("a failed job does not block the next one", async () => {
  const queue = createSerialQueue();
  const failed = queue.run(async () => {
    throw new Error("boom");
  });
  const next = queue.run(async () => "ok");

  await expect(failed).rejects.toThrow("boom");
  expect(await next).toBe("ok");
});
