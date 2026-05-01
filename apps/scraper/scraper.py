import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

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
        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        
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
                if not name:
                    continue
                
                # We extract text content to parse Phone, Rating, Reviews, Website
                text = await item.inner_text()
                
                import re
                
                # Rating and Reviews usually looks like "4.5 (123)" or "4.5 stars 123 Reviews"
                rating = 0.0
                reviews = 0
                rating_match = re.search(r'(\d\.\d)\s*\(([\d,]+)\)', text)
                if rating_match:
                    rating = float(rating_match.group(1))
                    reviews = int(rating_match.group(2).replace(',', ''))
                
                # Phone regex looking for US formats like (305) 555-1234 or +1 305...
                phone = ""
                phone_match = re.search(r'(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', text)
                if phone_match:
                    phone = phone_match.group(0)
                
                # Website check - simple heuristic, if 'Website' button exists
                website = ""
                website_btn = await item.query_selector('a[data-value="Website"]')
                if website_btn:
                    website_url = await website_btn.get_attribute('href')
                    if website_url:
                        # Extract clean URL
                        import urllib.parse
                        parsed = urllib.parse.urlparse(website_url)
                        website = parsed.netloc if parsed.netloc else parsed.path
                
                # Extract lat/lng from business link
                lat = 0.0
                lng = 0.0
                link = await item.query_selector('a')
                if link:
                    href = await link.get_attribute('href')
                    if href:
                        coord_match = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', href)
                        if coord_match:
                            lat = float(coord_match.group(1))
                            lng = float(coord_match.group(2))
                
                results.append({
                    "name": name,
                    "location": location,
                    "cat": "Local Business",
                    "source": "Google Maps",
                    "rating": rating,
                    "reviews": reviews,
                    "phone": phone,
                    "website": website,
                    "lat": lat,
                    "lng": lng,
                    "status": "open",
                    "score": 0 # Will be calculated by API
                })
        except Exception as e:
            print(f"Error during extraction: {e}")
            
        await browser.close()
        
    print(f"Extracted {len(results)} leads.")
    return results

if __name__ == "__main__":
    # Test locally
    asyncio.run(run_scrape("plumbers", "Miami"))
