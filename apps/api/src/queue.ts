import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export const scrapeQueue = new Queue('scrapeJobs', { connection });
export const scrapeQueueEvents = new QueueEvents('scrapeJobs', { connection });

// Define a worker that simply logs for now. The actual scraping is done in Python.
// In a full implementation, the Node API just adds to the queue, and Python workers consume from it.
// However, we can listen for completion events here.
export const setupQueueEvents = (io: any) => {
  scrapeQueueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`Job ${jobId} completed. Result:`, returnvalue);
    io.emit('job-completed', { jobId, result: returnvalue });
  });

  scrapeQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`Job ${jobId} failed. Reason: ${failedReason}`);
    io.emit('job-failed', { jobId, reason: failedReason });
  });

  scrapeQueueEvents.on('progress', ({ jobId, data }) => {
    console.log(`Job ${jobId} progress: ${data}`);
    io.emit('job-progress', { jobId, progress: data });
  });
};
