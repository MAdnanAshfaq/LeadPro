import asyncio
import re
import time
import urllib.parse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

async def run_scrape(query: str, location: str):
    print(f"Starting Industrial Deep Scrape: {query} in {location}")
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
        # Increased initial wait for regional resolution
        await page.wait_for_timeout(6000) 
        
        try:
            # 1. Broad Scanning with Infinite Scroll
            print("Broad Scanning (Infinite Scroll)...")
            feed_selector = 'div[role="feed"]'
            try:
                await page.wait_for_selector(feed_selector, timeout=10000)
                for _ in range(15): 
                    await page.evaluate(f'''
                        const feed = document.querySelector('{feed_selector}');
                        if (feed) {{
                            feed.scrollTo(0, feed.scrollHeight);
                        }}
                    ''')
                    await page.wait_for_timeout(1500)
            except:
                print("Feed selector not found, falling back to mouse wheel.")
                for _ in range(10):
                    await page.mouse.wheel(0, 5000)
                    await page.wait_for_timeout(1000)
                
            items = await page.query_selector_all('div[role="article"]')
            print(f"Discovered {len(items)} leads. Starting Deep Intel Extraction...")
            
            for i, item in enumerate(items[:60]): # Target top 60
                try:
                    # Basic extraction from the card (Fallback)
                    name = await item.get_attribute('aria-label')
                    if not name: continue
                    
                    # Try to get phone/website from card text first
                    card_text = await item.inner_text()
                    website = ""
                    phone = ""
                    
                    # Card-level website check
                    website_btn = await item.query_selector('a[aria-label*="Website"]')
                    if website_btn:
                        website = await website_btn.get_attribute('href')

                    # 2. Deep Click for Full Profile
                    await item.scroll_into_view_if_needed()
                    # Click precisely on the title or card body
                    await item.click(force=True, timeout=5000)
                    await page.wait_for_timeout(2500) # Crucial: Let profile load
                    
                    # High-fidelity extraction from the side panel
                    # Website (Source of Truth)
                    website_el = await page.query_selector('a[data-item-id="authority"]')
                    if not website_el:
                        website_el = await page.query_selector('a[aria-label^="Website:"]')
                    if website_el:
                        website = await website_el.get_attribute('href')
                    
                    # Phone (Source of Truth)
                    phone_el = await page.query_selector('button[data-item-id^="phone:tel:"]')
                    if phone_el:
                        phone = await phone_el.get_attribute('aria-label')
                        phone = phone.replace('Phone: ', '').strip() if phone else ""
                    
                    # Address
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
                    if cat_el:
                        cat = await cat_el.inner_text()

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
                        "lat": 0.0, # Will be set by API or if needed
                        "lng": 0.0,
                        "status": "open",
                        "score": 0
                    })
                    print(f"Scraped {i+1}: {name} | Phone: {phone or 'N/A'} | Web: {'Yes' if website else 'No'}")
                except Exception as ex:
                    print(f"Item extraction failed: {ex}")
                    continue

        except Exception as e:
            print(f"Critical Scrape Error: {e}")
            
        await browser.close()
        
    return results

if __name__ == "__main__":
    asyncio.run(run_scrape("plumbers", "Miami"))
