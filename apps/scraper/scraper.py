import asyncio
import re
import time
import urllib.parse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

async def scrape_single_viewport(page, query, location):
    results = []
    search_query = f"{query} in {location}"
    url = f"https://www.google.com/maps/search/{urllib.parse.quote(search_query)}"
    
    try:
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Infinite Scroll
        feed_selector = 'div[role="feed"]'
        for _ in range(8): 
            await page.evaluate(f'''
                const feed = document.querySelector('{feed_selector}');
                if (feed) feed.scrollBy(0, 5000);
            ''')
            await page.wait_for_timeout(1000)
            
        links = await page.query_selector_all('a.hfpxzc')
        for i, link in enumerate(links[:20]): # 20 leads per viewport to keep it fast
            try:
                name = await link.get_attribute('aria-label')
                if not name: continue
                
                await link.scroll_into_view_if_needed()
                await link.click(force=True)
                await page.wait_for_timeout(2000)
                
                # Extract details
                website = ""
                website_el = await page.query_selector('a[data-item-id="authority"]')
                if website_el: website = await website_el.get_attribute('href')
                
                phone = ""
                phone_el = await page.query_selector('button[data-item-id^="phone:tel:"]')
                if phone_el:
                    phone = await phone_el.get_attribute('aria-label')
                    phone = phone.replace('Phone: ', '').strip() if phone else ""
                
                address = ""
                address_el = await page.query_selector('button[data-item-id="address"]')
                if address_el:
                    address = await address_el.get_attribute('aria-label')
                    address = address.replace('Address: ', '').strip() if address else ""

                results.append({
                    "id": f"lead_{int(time.time())}_{i}",
                    "name": name,
                    "location": location,
                    "addr": address,
                    "phone": phone,
                    "website": website,
                    "source": "Google Maps",
                    "status": "open"
                })
            except: continue
    except Exception as e:
        print(f"Viewport scrape error: {e}")
    
    return results

async def run_scrape(query: str, location: str):
    print(f"Starting Grid Search for: {query} in {location}")
    all_results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()
        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        
        # 1. Determine Sub-Locations for Grid Search
        # If the user searches for a broad area like "New Jersey", we divide it.
        # For now, we'll use a simple 2x2 grid if it's a known large area, 
        # or just do the main search.
        
        # Heuristic: If location is a state, we do a 4-point grid.
        sub_locations = [location]
        if any(state in location.lower() for state in ['new jersey', 'california', 'texas', 'new york', 'florida']):
            # Common major cities in NJ for the grid
            if 'new jersey' in location.lower():
                sub_locations = ["Jersey City, NJ", "Newark, NJ", "Trenton, NJ", "Princeton, NJ", "Atlantic City, NJ"]
        
        for sub_loc in sub_locations:
            print(f"Scanning Grid Sector: {sub_loc}...")
            sector_results = await scrape_single_viewport(page, query, sub_loc)
            all_results.extend(sector_results)
            
        await browser.close()
        
    # Deduplicate by name
    unique_results = []
    seen = set()
    for r in all_results:
        if r['name'] not in seen:
            unique_results.append(r)
            seen.add(r['name'])
            
    print(f"Grid Search completed. Found {len(unique_results)} unique leads.")
    return unique_results

if __name__ == "__main__":
    asyncio.run(run_scrape("food spots", "New Jersey"))
