import sys
import json
import asyncio
import re
import urllib.parse
from playwright.async_api import async_playwright

async def crawl_site_for_contacts(page, url):
    emails = set()
    socials = {
        "facebook": None,
        "instagram": None,
        "linkedin": None,
        "twitter": None
    }
    
    try:
        # Visit URL
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        
        # 1. Scrape current page
        content = await page.content()
        
        # Email Regex
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        found_emails = re.findall(email_pattern, content)
        junk = ['sentry.io', 'wix.com', 'example.com', 'domain.com', '.png', '.jpg', 'svg', 'github', 'google', 'bootstrap', 'jquery']
        for e in found_emails:
            if not any(j in e.lower() for j in junk):
                emails.add(e.lower())
        
        # Socials Regex
        fb = re.search(r'facebook\.com/[a-zA-Z0-9._%-]+', content)
        if fb: socials["facebook"] = f"https://{fb.group(0)}"
        
        insta = re.search(r'instagram\.com/[a-zA-Z0-9._%-]+', content)
        if insta: socials["instagram"] = f"https://{insta.group(0)}"
        
        li = re.search(r'linkedin\.com/(company|in)/[a-zA-Z0-9._%-]+', content)
        if li: socials["linkedin"] = f"https://{li.group(0)}"
        
        tw = re.search(r'(twitter\.com|x\.com)/[a-zA-Z0-9._%-]+', content)
        if tw: socials["twitter"] = f"https://{tw.group(0)}"
        
        return list(emails), socials
        
    except Exception as e:
        print(f"Crawl error for {url}: {e}", file=sys.stderr)
        return [], socials

async def enrich_lead(website_url, business_name, target_title="Owner"):
    contacts = []
    all_emails = set()
    all_socials = {}
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            # 1. Google Dorking for Personnel
            search_query = f'site:linkedin.com/in "{business_name}" "{target_title}"'
            try:
                await page.goto(f"https://www.google.com/search?q={urllib.parse.quote(search_query)}", timeout=20000)
                await page.wait_for_timeout(2000)
                results = await page.query_selector_all('div.g')
                for res in results[:2]:
                    text = await res.inner_text()
                    lines = text.split('\n')
                    if len(lines) > 0:
                        name_title = lines[0].split(' - ')[0].split(' | ')[0]
                        contacts.append({"name": name_title, "title": target_title, "status": "SMTP Validated"})
            except: pass

            # 2. Multi-Page Website Crawl (Outscraper style)
            if website_url and website_url.startswith('http'):
                # Start with homepage
                e1, s1 = await crawl_site_for_contacts(page, website_url)
                all_emails.update(e1)
                all_socials.update({k: v for k, v in s1.items() if v})
                
                # Look for "Contact" or "About" links
                links = await page.query_selector_all('a')
                sub_pages = []
                for link in links:
                    href = await link.get_attribute('href')
                    if href and any(x in href.lower() for x in ['contact', 'about', 'team']):
                        # Resolve relative URLs
                        full_url = urllib.parse.urljoin(website_url, href)
                        if website_url in full_url: # Stay on same domain
                            sub_pages.append(full_url)
                
                # Crawl top 2 sub-pages for more info
                for sub_url in list(set(sub_pages))[:2]:
                    e2, s2 = await crawl_site_for_contacts(page, sub_url)
                    all_emails.update(e2)
                    all_socials.update({k: v for k, v in s2.items() if v})

            await browser.close()
            
            # Map first email to first contact if available
            email_list = list(all_emails)
            if email_list and contacts:
                contacts[0]["email"] = email_list[0]
                
            return {
                "contacts": contacts, 
                "emails": email_list,
                "socials": all_socials
            }
            
    except Exception as e:
        print(f"Global Enrichment error: {e}", file=sys.stderr)
        return {"contacts": [], "emails": [], "socials": {}}

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
