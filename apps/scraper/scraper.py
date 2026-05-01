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
                
            # Extract data by clicking each item for deep info
            items = await page.query_selector_all('div[role="article"]')
            for i, item in enumerate(items):
                try:
                    # Click to open detail panel
                    await item.click()
                    await page.wait_for_timeout(2000) # Wait for panel to load
                    
                    name = await item.get_attribute('aria-label')
                    if not name:
                        continue
                    
                    # Extract detailed data from the now-open detail panel
                    # Website
                    website = ""
                    website_el = await page.query_selector('a[data-item-id="authority"]')
                    if not website_el:
                        website_el = await page.query_selector('a[aria-label^="Website:"]')
                    
                    if website_el:
                        website = await website_el.get_attribute('href')
                    
                    # Phone
                    phone = ""
                    phone_el = await page.query_selector('button[data-item-id^="phone:tel:"]')
                    if phone_el:
                        phone_text = await phone_el.get_attribute('aria-label')
                        if phone_text:
                            phone = phone_text.replace('Phone: ', '')
                    
                    # Address
                    address = ""
                    address_el = await page.query_selector('button[data-item-id="address"]')
                    if address_el:
                        address = await address_el.get_attribute('aria-label')
                        if address:
                            address = address.replace('Address: ', '')
                    
                    # Rating/Reviews
                    rating = 0.0
                    reviews = 0
                    rating_el = await page.query_selector('div.F7nice span[aria-hidden="true"]')
                    if rating_el:
                        rating_text = await rating_el.inner_text()
                        rating = float(rating_text.replace(',', '.'))
                    
                    reviews_el = await page.query_selector('div.F7nice span[aria-label*="reviews"]')
                    if reviews_el:
                        reviews_text = await reviews_el.get_attribute('aria-label')
                        reviews_match = re.search(r'([\d,]+)', reviews_text)
                        if reviews_match:
                            reviews = int(reviews_match.group(1).replace(',', ''))
                    
                    # Category
                    cat = "Local Business"
                    cat_el = await page.query_selector('button[data-item-id="address"] + div button') # Heuristic
                    if cat_el:
                        cat = await cat_el.inner_text()

                    # Lat/Lng (from URL)
                    lat, lng = 0.0, 0.0
                    curr_url = page.url
                    coord_match = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', curr_url)
                    if coord_match:
                        lat = float(coord_match.group(1))
                        lng = float(coord_match.group(2))

                    results.append({
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
                    
                    # Close panel if needed or just click next
                    print(f"Deep-scraped: {name}")
                except Exception as ex:
                    print(f"Error deep-scraping item {i}: {ex}")
                    continue

        except Exception as e:
            print(f"Error during extraction: {e}")
            
        await browser.close()
        
    print(f"Extracted {len(results)} leads.")
    return results

if __name__ == "__main__":
    # Test locally
    asyncio.run(run_scrape("plumbers", "Miami"))
