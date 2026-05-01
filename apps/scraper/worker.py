import asyncio
import os
from dotenv import load_dotenv
from bullmq import Worker
from scraper import run_scrape

load_dotenv()

async def process_job(job, job_token):
    print(f"Processing job {job.id} with data: {job.data}")
    query = job.data.get("query")
    location = job.data.get("location")
    
    # Notify progress
    await job.updateProgress(10)
    
    # Run the scraper
    results = await run_scrape(query, location)
    
    await job.updateProgress(100)
    return results

async def main():
    redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")
    print(f"Starting Python worker, connecting to {redis_url}")
    
    worker = Worker("scrapeJobs", process_job, {"connection": redis_url})
    
    # Keep the worker running
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
