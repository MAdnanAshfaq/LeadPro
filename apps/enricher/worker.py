import asyncio
import os
from bullmq import Worker
from enricher import enrich_website

async def process_job(job, job_token):
    print(f"Processing enrichment job {job.id} for website: {job.data.get('website')}")
    website = job.data.get("website")
    
    if not website:
        return {"error": "No website provided"}
        
    await job.updateProgress(20)
    results = await enrich_website(website)
    await job.updateProgress(100)
    
    return results

async def main():
    redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")
    print(f"Starting Enricher worker, connecting to {redis_url}")
    
    worker = Worker("enrichJobs", process_job, {"connection": redis_url})
    
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
