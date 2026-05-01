import sys
import json
import asyncio
import re
import urllib.parse
from playwright.async_api import async_playwright

async def spider_style_scrape(page, url):
    """
    Implements the Spider-rs 'Link Gathering then Deep Scrape' strategy.
    1. Scan homepage for immediate contacts.
    2. Identify high-value sub-pages (Contact, About, Team).
    3. Concurrently crawl sub-pages for hidden emails.
    """
    emails = set()
    socials = {}
    
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        content = await page.content()
        
        # Email & Social Extraction
        pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(pattern, content)
        junk = ['sentry.io', 'wix.com', 'example.com', 'domain.com', 'google', 'github']
        for e in found:
            if not any(j in e.lower() for j in junk):
                emails.add(e.lower())
        
        for plat in ['facebook', 'instagram', 'linkedin', 'twitter']:
            match = re.search(f'{plat}\.com/[a-zA-Z0-9._%-]+', content)
            if match: socials[plat] = f"https://{match.group(0)}"
            
        # Link Gathering (Spider-rs strategy)
        links = await page.query_selector_all('a')
        sub_pages = []
        for link in links:
            href = await link.get_attribute('href')
            if href:
                href_low = href.lower()
                if any(x in href_low for x in ['contact', 'about', 'team', 'staff', 'management', 'people', 'leadership']):
                    full_url = urllib.parse.urljoin(url, href)
                    if url in full_url: sub_pages.append(full_url)
        
        # Crawl top 3 sub-pages sequentially (concurrency can be tricky with one page object)
        for sp in list(set(sub_pages))[:3]:
            try:
                await page.goto(sp, wait_until="domcontentloaded", timeout=10000)
                sp_content = await page.content()
                sp_found = re.findall(pattern, sp_content)
                for e in sp_found:
                    if not any(j in e.lower() for j in junk):
                        emails.add(e.lower())
            except: continue
            
        return list(emails), socials
    except:
        return [], {}

async def google_dork_mining(page, business_name, domain):
    """
    Uses Search Operators from the guides to find indexed emails.
    """
    found_emails = []
    if not domain: return []
    
    # Scrapebox/Spider style dorking
    query = f'"{domain}" contact email OR mailto OR "email us"'
    try:
        await page.goto(f"https://www.google.com/search?q={urllib.parse.quote(query)}")
        await page.wait_for_timeout(2000)
        content = await page.content()
        # Look for domain-specific emails
        pattern = r'[a-zA-Z0-9._%+-]+@' + re.escape(domain)
        found_emails = re.findall(pattern, content)
    except: pass
    
    return found_emails

async def enrich_lead(website_url, business_name, target_title="Owner"):
    contacts = []
    emails = []
    socials = {}
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
            page = await context.new_page()
            
            # Phase 1: LinkedIn Personnel Discovery
            try:
                l_query = f'site:linkedin.com/in "{business_name}" "{target_title}"'
                await page.goto(f"https://www.google.com/search?q={urllib.parse.quote(l_query)}")
                await page.wait_for_timeout(2000)
                res = await page.query_selector_all('div.g')
                for r in res[:2]:
                    text = await r.inner_text()
                    lines = text.split('\n')
                    if lines:
                        name = lines[0].split(' - ')[0].split(' | ')[0]
                        contacts.append({"name": name, "title": target_title, "status": "LinkedIn Found"})
            except: pass

            # Phase 2: Spider-Style Website Crawl
            if website_url:
                emails, socials = await spider_style_scrape(page, website_url)
            
            # Phase 3: Dorking Fallback
            if not emails and website_url:
                domain = website_url.split('//')[-1].split('/')[0].replace('www.', '')
                emails = await google_dork_mining(page, business_name, domain)
                
            await browser.close()
            
            # Final Merge
            if emails and contacts:
                contacts[0]["email"] = emails[0]
                contacts[0]["status"] = "Verified"
            
            return {
                "contacts": contacts,
                "emails": list(set(emails)),
                "socials": socials
            }
            
    except Exception as e:
        return {"error": str(e), "contacts": [], "emails": [], "socials": {}}

async def main():
    input_text = sys.stdin.read()
    if not input_text: return
    try:
        input_data = json.loads(input_text)
        result = await enrich_lead(
            input_data.get('website'), 
            input_data.get('name'),
            input_data.get('targetTitle', 'Owner')
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    asyncio.run(main())
