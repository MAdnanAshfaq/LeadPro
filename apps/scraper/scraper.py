import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

async def run_scrape(query: str, location: str):
    print(f"Starting Playwright scrape for: {query} in {location}")
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        
        # Apply stealth to bypass bot detection
        await stealth_async(page)
        
        search_query = f"{query} in {location}"
        url = f"https://www.google.com/maps/search/{search_query.replace(' ', '+')}"
        
        await page.goto(url)
        await page.wait_for_timeout(3000) # Give time to load
        
        # Grid Search Algorithm implementation would go here.
        # For MVP, we extract the first few visible results.
        
        try:
            # Look for the feed container
            feed = await page.wait_for_selector('div[role="feed"]', timeout=10000)
            
            # Simple scroll loop to load more items
            for _ in range(3):
                await page.mouse.wheel(0, 5000)
                await page.wait_for_timeout(2000)
                
            # Extract basic data
            items = await page.query_selector_all('div[role="article"]')
            for item in items:
                name = await item.get_attribute('aria-label')
                if name:
                    results.append({
                        "name": name,
                        "location": location,
                        "source": "Google Maps"
                    })
        except Exception as e:
            print(f"Error during extraction: {e}")
            
        await browser.close()
        
    print(f"Extracted {len(results)} leads.")
    return results

if __name__ == "__main__":
    # Test locally
    asyncio.run(run_scrape("plumbers", "Miami"))
