import sys
import json
import asyncio
import re
import urllib.parse
from playwright.async_api import async_playwright

async def discover_and_scrape(page, base_url):
    emails = set()
    socials = {}
    
    try:
        await page.goto(base_url, wait_until="domcontentloaded", timeout=15000)
        
        # 1. Scrape Homepage
        content = await page.content()
        
        # Email Regex (Firecrawl style persistence)
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found = re.findall(email_pattern, content)
        junk = ['sentry.io', 'wix.com', 'example.com', 'domain.com', '.png', '.jpg', 'svg', 'github', 'google']
        for e in found:
            if not any(j in e.lower() for j in junk):
                emails.add(e.lower())
        
        # Socials
        for plat in ['facebook', 'instagram', 'linkedin', 'twitter']:
            match = re.search(f'{plat}\.com/[a-zA-Z0-9._%-]+', content)
            if match: socials[plat] = f"https://{match.group(0)}"
            
        # 2. Find "Contact" or "About" pages
        links = await page.query_selector_all('a')
        contact_pages = []
        for link in links:
            href = await link.get_attribute('href')
            if href and any(x in href.lower() for x in ['contact', 'about', 'team', 'staff', 'owner', 'management']):
                contact_pages.append(urllib.parse.urljoin(base_url, href))
        
        # Crawl the best contact page found
        for cp_url in list(set(contact_pages))[:2]:
            try:
                await page.goto(cp_url, wait_until="domcontentloaded", timeout=10000)
                cp_content = await page.content()
                cp_found = re.findall(email_pattern, cp_content)
                for e in cp_found:
                    if not any(j in e.lower() for j in junk):
                        emails.add(e.lower())
            except: continue
            
        return list(emails), socials
    except:
        return [], {}

async def enrich_lead(website_url, business_name, target_title="Owner"):
    contacts = []
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent="Mozilla/5.0")
            page = await context.new_page()
            
            # Phase A: Google Dorking for Decision Makers
            dork_query = f'site:linkedin.com/in "{business_name}" "{target_title}"'
            try:
                await page.goto(f"https://www.google.com/search?q={urllib.parse.quote(dork_query)}")
                await page.wait_for_timeout(2000)
                results = await page.query_selector_all('div.g')
                for res in results[:2]:
                    text = await res.inner_text()
                    lines = text.split('\n')
                    if len(lines) > 0:
                        name_title = lines[0].split(' - ')[0].split(' | ')[0]
                        contacts.append({"name": name_title, "title": target_title, "status": "LinkedIn Identified"})
            except: pass

            # Phase B: Deep Crawl for Emails & Socials (Firecrawl Style)
            found_emails = []
            socials = {}
            if website_url:
                found_emails, socials = await discover_and_scrape(page, website_url)
            
            # Phase C: Google Pattern Mining (If no emails found yet)
            if not found_emails and website_url:
                domain = website_url.split('//')[-1].split('/')[0].replace('www.', '')
                pattern_query = f'"{domain}" contact email OR mailto'
                try:
                    await page.goto(f"https://www.google.com/search?q={urllib.parse.quote(pattern_query)}")
                    await page.wait_for_timeout(2000)
                    p_content = await page.content()
                    p_found = re.findall(r'[a-zA-Z0-9._%+-]+@' + re.escape(domain), p_content)
                    found_emails.extend(p_found)
                except: pass

            await browser.close()
            
            # Final Merge
            if found_emails and contacts:
                contacts[0]["email"] = found_emails[0]
                contacts[0]["status"] = "Verified"
                
            return {
                "contacts": contacts,
                "emails": list(set(found_emails)),
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
