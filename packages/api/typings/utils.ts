import { JobStatus, QueueJob, QueueJobJson } from './app';

export type KeyOf<T> = Array<keyof T>;

export interface JobWithStatus extends QueueJobJson {
  status: JobStatus;
}
export interface JobStatusFunction {
  (job: QueueJob): JobWithStatus;
}
