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

app.use(cors());
app.use(express.json());

// Setup Queue Events for WebSockets
setupQueueEvents(io);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LeadMap API is running' });
});

app.post('/api/v1/search', async (req, res) => {
  try {
    const { query, location, targetTitle, filters } = req.body;
    
    if (!query || !location) {
      return res.status(400).json({ error: 'Query and location are required' });
    }

    const job = await scrapeQueue.add('scrape', {
      query,
      location,
      targetTitle: targetTitle || 'Owner',
      filters
    });

    res.json({ jobId: job.id, status: 'queued' });
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
