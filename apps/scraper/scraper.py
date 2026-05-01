import asyncio
import re
import time
import urllib.parse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

async def run_scrape(query: str, location: str):
    print(f"Starting Elite Deep Scrape: {query} in {location}")
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
        await page.wait_for_timeout(6000) 
        
        try:
            # 1. Broad Scanning with Javascript-Direct Scrolling
            print("Infinite Scrolling for Depth...")
            for _ in range(15): 
                await page.evaluate('''
                    const scrollable = document.querySelector('div[role="feed"]');
                    if (scrollable) {
                        scrollable.scrollTop = scrollable.scrollHeight;
                    } else {
                        window.scrollBy(0, 5000);
                    }
                ''')
                await page.wait_for_timeout(1500)
                
            # 2. Identify Result Links (The hfpxzc class is the Google Maps standard)
            links = await page.query_selector_all('a.hfpxzc')
            if not links:
                links = await page.query_selector_all('div[role="article"] a')
            
            print(f"Discovered {len(links)} candidate leads. Starting Deep Extraction...")
            
            for i, link in enumerate(links[:50]):
                try:
                    name = await link.get_attribute('aria-label')
                    if not name: continue
                    
                    # Click the link directly to open the profile
                    await link.scroll_into_view_if_needed()
                    await link.click(force=True)
                    await page.wait_for_timeout(3000) # Give it 3 full seconds to load profile
                    
                    # High-fidelity extraction from the side panel
                    # Website
                    website = ""
                    website_el = await page.query_selector('a[data-item-id="authority"]')
                    if website_el:
                        website = await website_el.get_attribute('href')
                    
                    # Phone
                    phone = ""
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

                    # Rating / Reviews (Robust multi-selector)
                    rating = 0.0
                    reviews = 0
                    
                    # Method 1: The F7nice div
                    stats_el = await page.query_selector('div.F7nice')
                    if stats_el:
                        text = await stats_el.inner_text()
                        # Match something like "4.5 (123)"
                        r_match = re.search(r'(\d[\.,]\d)', text)
                        rv_match = re.search(r'\(([\d,\.]+)\)', text)
                        if r_match: rating = float(r_match.group(1).replace(',', '.'))
                        if rv_match: reviews = int(rv_match.group(1).replace(',', '').replace('.', ''))

                    # Category
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
                        "lat": 0.0,
                        "lng": 0.0,
                        "status": "open",
                        "score": 0
                    })
                    print(f"Scraped {i+1}: {name} | Phone: {phone or 'N/A'} | Web: {'Yes' if website else 'No'}")
                except Exception as ex:
                    print(f"Item {i} failed: {ex}")
                    continue

        except Exception as e:
            print(f"Global Scrape Error: {e}")
            
        await browser.close()
    
    return results

if __name__ == "__main__":
    asyncio.run(run_scrape("plumbers", "Miami"))
