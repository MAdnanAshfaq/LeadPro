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
    
    // Perform enrichment on each lead with a website
    const enrichAndScore = async () => {
      const targetTitle = (scrapeQueue as any)._targetTitle || "Owner";
      const path = require('path');
      const enricherPath = path.resolve(__dirname, '../../../../enricher/enricher.py');

      const finalLeads = await Promise.all(resultsArray.map(async (lead: any) => {
        let enrichedData: any = { contacts: [] };
        try {
          // Spawn enricher script
          const { spawnSync } = require('child_process');
          const input = JSON.stringify({ ...lead, targetTitle });
          const result = spawnSync('python', [enricherPath], { input });
          
          if (result.stdout) {
            const output = result.stdout.toString().trim();
            if (output) {
              enrichedData = JSON.parse(output) || { contacts: [] };
            }
          }
        } catch (e) {
          console.error("Enrichment spawn failed", e);
        }

        const mergedLead = { ...lead, ...enrichedData };
        if (mergedLead.contacts && mergedLead.contacts.length > 0 && mergedLead.contacts[0].email) {
          mergedLead.email = mergedLead.contacts[0].email;
        }

        const scoreData = calculateLeadScore({
          name: mergedLead.name,
          rating: mergedLead.rating,
          reviewCount: mergedLead.reviews,
          website: mergedLead.website,
          email: mergedLead.email,
          phone: mergedLead.phone
        });

        return { ...mergedLead, score: scoreData.score };
      }));

      io.emit('job-completed', { jobId, result: finalLeads });
    };

    enrichAndScore();
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
