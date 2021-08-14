import {
  BullBoardRequest,
  ControllerHandlerReturnType,
  JobStatus,
  QueueJob,
} from '../../typings/app';
import { JobStatusFunction, JobWithStatus } from '../../typings/utils';
import { subHours, isAfter, startOfHour } from 'date-fns';

import { BaseAdapter } from '../queueAdapters/base';
import { queueProvider } from '../providers/queue';

interface Item {
  id?: string | number | null | undefined;
  processed: string;
  status: JobStatus;
  value: number;
}
type Output = {
  [any: string]: Item;
};

type StatusOutput = {
  [K in JobStatus]: Output;
};

async function getStatsForQueue(queue: BaseAdapter, since: any): Promise<Item[]> {
  // there's no great way to get all the jobs and then get
  // the state of each one, so we just fetch each job
  // type here
  const [completedJobs, waitingJobs, failedJobs] = await Promise.all([
    queue.getJobs(['completed']),
    queue.getJobs(['waiting']),
    queue.getJobs(['failed']),
  ]);
  const allJobsInPeriod = [
    ...completedJobs.map(mapStatus('completed')),
    ...waitingJobs.map(mapStatus('waiting')),
    ...failedJobs.map(mapStatus('failed')),
  ].filter((job) => isAfter(<number>job.finishedOn, since));

  const grouped = allJobsInPeriod.reduce<Output>((out: Output, job: JobWithStatus) => {
    const processed = startOfHour(<number>job.processedOn).toISOString();
    const data = {
      id: job.id,
      status: job.status,
      processed,
    };
    return {
      ...out,
      [processed]: {
        ...data,
        value: out[processed] ? out[processed].value + 1 : 1,
      },
    };
  }, {});

  return Object.keys(grouped).map((key) => ({
    processed: key,
    value: grouped[key].value,
    status: grouped[key].status,
  }));
}

async function queueStats(
  _req: BullBoardRequest,
  queue: BaseAdapter
): Promise<ControllerHandlerReturnType> {
  const last24Hours = subHours(Date.now(), 24);
  const jobStats = await getStatsForQueue(queue, last24Hours);

  return {
    status: 200,
    body: jobStats,
  };
}

function allQueueStats(queues: BaseAdapter[]) {
  const last24Hours = subHours(Date.now(), 24);
  return Promise.all(queues.map((queue) => getStatsForQueue(queue, last24Hours)));
}

export const allStatsHandler = async ({
  queues: bullBoardQueues,
}: BullBoardRequest): Promise<ControllerHandlerReturnType> => {
  const queues = [...bullBoardQueues.values()];
  const queueStats = queues.length > 0 ? await allQueueStats(queues) : [];
  const joined = queueStats.reduce((out, stat) => {
    return [...out, ...stat];
  }, []);

  const grouped = joined.reduce<StatusOutput>(
    (out: StatusOutput, job: Item) => {
      let output = out[job.status];
      if (output[job.processed]) {
        output = {
          ...output,
          [job.processed]: {
            ...output[job.processed],
            value: output[job.processed].value + 1,
          },
        };
      } else {
        output = {
          ...output,
          [job.processed]: {
            ...job,
            value: 1,
          },
        };
      }
      return {
        ...out,
        [job.status]: output,
      };
    },
    <StatusOutput>{ completed: {}, failed: {} }
  );

  return {
    body: {
      completed: mapGroup(grouped.completed),
      failed: mapGroup(grouped.failed),
      ungrouped: queueStats,
    },
  };
};

export const queueStatsHandler = queueProvider(queueStats, {
  skipReadOnlyModeCheck: true,
});

function mapStatus(status: JobStatus): JobStatusFunction {
  return (job: QueueJob) => ({ ...job.toJSON(), status });
}

function mapGroup(grouped: Output) {
  return Object.keys(grouped).map((key) => ({
    processed: key,
    value: grouped[key].value,
    status: grouped[key].status,
  }));
}
