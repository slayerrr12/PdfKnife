import { parentPort, workerData } from 'node:worker_threads';

import type { ProgressReporter } from '../services/progress';
import { executeOperation } from '../services/operations';
import type { WorkerTaskEvent, WorkerTaskRequest } from '../services/contracts';

const port = parentPort as NonNullable<typeof parentPort>;
if (!port) {
  throw new Error('Worker started without a parent port.');
}

const task = workerData as WorkerTaskRequest;

const reporter: ProgressReporter = {
  report(progress, stage, detail) {
    const event: WorkerTaskEvent = {
      type: 'progress',
      payload: {
        taskId: task.taskId,
        progress,
        stage,
        detail,
      },
    };
    port.postMessage(event);
  },
};

async function main(): Promise<void> {
  try {
    const result = await executeOperation(task.runtime, task.operation, task.payload as never, reporter);
    const event: WorkerTaskEvent = {
      type: 'done',
      payload: {
        taskId: task.taskId,
        status: 'success',
        result,
      },
    };
    port.postMessage(event);
  } catch (error) {
    const event: WorkerTaskEvent = {
      type: 'error',
      payload: {
        taskId: task.taskId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown worker error',
      },
    };
    port.postMessage(event);
  }
}

main().catch((error) => {
  const event: WorkerTaskEvent = {
    type: 'error',
    payload: {
      taskId: task.taskId,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown worker bootstrap error',
    },
  };
  port.postMessage(event);
});
