import asyncio
import re
import time
import urllib.parse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

async def run_scrape(query: str, location: str):
    print(f"Starting Playwright Deep Scrape for: {query} in {location}")
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = await context.new_page()
        
        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        
        search_query = f"{query} in {location}"
        url = f"https://www.google.com/maps/search/{urllib.parse.quote(search_query)}"
        
        await page.goto(url)
        await page.wait_for_timeout(5000) 
        
        try:
            # Scroll aggressively to load up to 40-50 leads
            print("Infinite scrolling for broad coverage...")
            for _ in range(12): 
                await page.mouse.wheel(0, 10000)
                await page.wait_for_timeout(1000)
                if await page.query_selector('text="You\'ve reached the end of the list"'):
                    break
                
            items = await page.query_selector_all('div[role="article"]')
            print(f"Found {len(items)} candidates. Starting Deep Extraction on top 40...")
            
            for i, item in enumerate(items[:40]):
                try:
                    await item.scroll_into_view_if_needed()
                    await item.click(force=True)
                    await page.wait_for_timeout(2000) # Deep extraction requires panel load time
                    
                    name = await item.get_attribute('aria-label')
                    if not name: continue
                    
                    # High-precision selectors for the Google Maps Profile Panel
                    website = ""
                    website_el = await page.query_selector('a[data-item-id="authority"]')
                    if not website_el:
                        website_el = await page.query_selector('a[aria-label^="Website:"]')
                    if website_el:
                        website = await website_el.get_attribute('href')
                    
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

                    rating = 0.0
                    reviews = 0
                    stats_el = await page.query_selector('div.F7nice')
                    if stats_el:
                        stats_text = await stats_el.inner_text()
                        match = re.search(r'(\d[\.,]\d)\s*\(([\d,\.]+)\)', stats_text)
                        if match:
                            rating = float(match.group(1).replace(',', '.'))
                            reviews = int(match.group(2).replace(',', '').replace('.', ''))

                    cat = "Local Business"
                    cat_el = await page.query_selector('button[jsaction*="category"]')
                    if not cat_el:
                        cat_el = await page.query_selector('button[data-item-id="address"] + div button')
                    if cat_el:
                        cat = await cat_el.inner_text()

                    lat, lng = 0.0, 0.0
                    curr_url = page.url
                    coord_match = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', curr_url)
                    if coord_match:
                        lat = float(coord_match.group(1))
                        lng = float(coord_match.group(2))

                    results.append({
                        "id": f"lead_{i}_{int(time.time())}",
                        "name": name,
                        "location": location,
                        "cat": cat,
                        "addr": address,
                        "source": "Google Maps",
                        "rating": rating,
                        "reviews": reviews,
                        "phone": phone,
                        "website": website,
                        "lat": lat,
                        "lng": lng,
                        "status": "open",
                        "score": 0
                    })
                    print(f"Scraped {i+1}/40: {name} (Web: {'Yes' if website else 'No'})")
                except Exception as ex:
                    print(f"Error scraping item {i}: {ex}")
                    continue

        except Exception as e:
            print(f"Global extraction error: {e}")
            
        await browser.close()
        
    print(f"Extracted {len(results)} high-quality leads.")
    return results

if __name__ == "__main__":
    asyncio.run(run_scrape("plumbers", "Miami"))
