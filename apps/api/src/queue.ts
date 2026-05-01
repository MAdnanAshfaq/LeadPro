import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null
});

export const scrapeQueue = new Queue('scrapeJobs', { connection });
export const scrapeQueueEvents = new QueueEvents('scrapeJobs', { connection });

// Define a worker that simply logs for now. The actual scraping is done in Python.
// In a full implementation, the Node API just adds to the queue, and Python workers consume from it.
// However, we can listen for completion events here.
import { calculateLeadScore } from './scoring';

export const setupQueueEvents = (io: any) => {
  scrapeQueueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`Job ${jobId} completed. Scoring results...`);
    
    // Apply score to each result
    const resultsArray = (Array.isArray(returnvalue) ? returnvalue : []) as any[];
    const scoredResults = resultsArray.map((lead: any) => {
      const scoreData = calculateLeadScore({
        name: lead.name,
        rating: lead.rating,
        reviewCount: lead.reviews,
        website: lead.website,
        email: lead.email,
        phone: lead.phone
      });
      return { ...lead, score: scoreData.score };
    });

    io.emit('job-completed', { jobId, result: scoredResults });
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
