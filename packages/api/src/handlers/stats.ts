import { BullBoardRequest, ControllerHandlerReturnType, QueueJob } from '../../typings/app';
import { JobStatusFunction, JobWithStatus } from '../../typings/utils';
import { subHours, isAfter, startOfHour } from 'date-fns';

import { BaseAdapter } from '../queueAdapters/base';
import { queueProvider } from '../providers/queue';

interface Item {
  id: string | number | null | undefined;
  status: string;
  value: number;
}
type Output = {
  [any: string]: Item;
};

async function allStats(): Promise<ControllerHandlerReturnType> {
  return {
    status: 200,
    body: {},
  };
}

async function queueStats(
  _req: BullBoardRequest,
  queue: BaseAdapter
): Promise<ControllerHandlerReturnType> {
  const last24Hours = subHours(Date.now(), 24);
  // there's no great way to get all the jobs and then get
  // the state of each one, so we just fetch each job
  // type here
  const completedJobs = await queue.getJobs(['completed']);
  const waitingJobs = await queue.getJobs(['waiting']);
  const failedJobs = await queue.getJobs(['failed']);
  const allJobsInPeriod = [
    ...completedJobs.map(mapStatus('completed')),
    ...waitingJobs.map(mapStatus('waiting')),
    ...failedJobs.map(mapStatus('failed')),
  ].filter((job) => isAfter(<number>job.finishedOn, last24Hours));

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

  const jobStats = Object.keys(grouped).map((key) => ({
    processed: key,
    value: grouped[key].value,
    status: grouped[key].status,
  }));
  return {
    status: 200,
    body: jobStats,
  };
}

export const allStatsHandler = queueProvider(allStats, {
  skipReadOnlyModeCheck: true,
});

export const queueStatsHandler = queueProvider(queueStats, {
  skipReadOnlyModeCheck: true,
});

function mapStatus(status: string): JobStatusFunction {
  return (job: QueueJob) => ({ ...job.toJSON(), status });
}
