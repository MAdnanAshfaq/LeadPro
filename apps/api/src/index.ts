import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import { setupQueueEvents, scrapeQueue } from './queue';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

const path = require('path');
app.use(cors());
app.use(express.json());

// Serve Static Frontend
const frontendPath = path.resolve(__dirname, '../../web/out');
app.use(express.static(frontendPath));

// Fallback for SPA (Single Page App) routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// Setup Queue Events for WebSockets
setupQueueEvents(io);

app.get('/', (req, res) => {
  res.json({ 
    name: 'LeadMap Pro Intelligence API', 
    version: '1.0.0', 
    status: 'online',
    endpoints: ['/health', '/api/v1/search']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LeadMap API is running' });
});

app.post('/api/v1/search', async (req, res) => {
  try {
    const { query, location, targetTitle, filters } = req.body;
    
    if (!query || !location) {
      return res.status(400).json({ error: 'Query and location are required' });
    }

    const jobId = `job_${Date.now()}`;
    res.json({ jobId, status: 'processing' });

    // Execute Scraper Directly (Bypassing BullMQ/Redis for local reliability)
    const { spawn } = require('child_process');
    const path = require('path');
    const scraperPath = path.resolve(__dirname, '../../scraper/scraper.py');
    const enricherPath = path.resolve(__dirname, '../../enricher/enricher.py');

    console.log(`Starting direct scrape for ${query} in ${location}...`);
    
    // 1. Run Scraper
    const python = spawn('python', [scraperPath, query, location]);
    let scraperOutput = '';
    
    python.stdout.on('data', (data: any) => {
      scraperOutput += data.toString();
    });

    python.on('close', async (code: number) => {
      try {
        const lines = scraperOutput.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        if (!lastLine) throw new Error("No output from scraper");
        const leads = JSON.parse(lastLine);

        // 2. Enrich each lead
        const finalLeads = await Promise.all(leads.map(async (lead: any) => {
          return new Promise((resolve) => {
            const enricher = spawn('python', [enricherPath]);
            const input = JSON.stringify({ ...lead, targetTitle });
            enricher.stdin.write(input);
            enricher.stdin.end();

            let enricherOutput = '';
            enricher.stdout.on('data', (d: any) => { enricherOutput += d.toString(); });
            enricher.on('close', () => {
              try {
                const enriched = JSON.parse(enricherOutput.trim());
                resolve({ ...lead, ...enriched });
              } catch { resolve(lead); }
            });
          });
        }));

        io.emit('job-completed', { jobId, result: finalLeads });
      } catch (err) {
        console.error("Scraper parsing failed", err);
      }
    });

  } catch (error) {
    console.error('Error creating search job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

io.on('connection', (socket: any) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
