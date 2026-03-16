import test from "node:test";
import assert from "node:assert/strict";
import { createClip2StickerCore } from "../src/index.js";

class FakeWorker {
  constructor() {
    this.listeners = new Map();
    this.messages = [];
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  postMessage(message) {
    this.messages.push(message);

    const listener = this.listeners.get("message");
    if (!listener) {
      return;
    }

    if (message.type === "load") {
      listener({ data: { id: message.id, result: { loaded: true } } });
      return;
    }

    listener({
      data: {
        id: message.id,
        result: {
          outputBytes: new Uint8Array([1, 2, 3]).buffer,
          outputName: "output.webm",
          logs: ["ok"],
        },
      },
    });
  }

  terminate() {}
}

test("runtime posts load and transcode messages through worker adapter", async () => {
  const fakeWorker = new FakeWorker();
  const core = createClip2StickerCore({
    workerFactory: () => fakeWorker,
    threads: 3,
  });

  await core.load();
  const result = await core.transcode({
    input: new Uint8Array([1, 2, 3]),
    inputName: "input.mp4",
    fitMode: "contain",
    fps: 20,
    durationSeconds: 2,
  });

  assert.equal(fakeWorker.messages[0].type, "load");
  assert.equal(fakeWorker.messages[1].type, "transcode");
  assert.deepEqual(Array.from(result.output), [1, 2, 3]);
  assert.equal(result.outputName, "output.webm");
});

