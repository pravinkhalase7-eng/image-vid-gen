import { processOneJob } from "./pipeline";
import { sleep } from "@/lib/utils";
import { logError } from "@/lib/logging";

let running = false;
let loopStarted = false;

export function startBackgroundWorker() {
  if (loopStarted) return;
  loopStarted = true;
  running = true;
  void loop();
}

export function stopBackgroundWorker() {
  running = false;
  loopStarted = false;
}

async function loop() {
  while (running) {
    try {
      const did = await processOneJob();
      if (!did) await sleep(4000);
    } catch (error) {
      logError("worker.loop", error);
      await sleep(8000);
    }
  }
}
