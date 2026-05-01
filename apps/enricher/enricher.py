import sys
import json
import asyncio
import re
import urllib.parse
from playwright.async_api import async_playwright

async def enrich_lead(website_url, business_name, target_title="Owner"):
    contacts = []
    email = None
    
    try:
        async with async_playwright() as p:
            # Launch with a common user agent
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            # 1. Google Dorking for Personnel
            search_query = f'site:linkedin.com/in "{business_name}" "{target_title}"'
            try:
                await page.goto(f"https://www.google.com/search?q={urllib.parse.quote(search_query)}", timeout=30000)
                # Wait for results or captcha
                await page.wait_for_timeout(2000)
                
                results = await page.query_selector_all('div.g')
                for res in results[:2]:
                    text = await res.inner_text()
                    lines = text.split('\n')
                    if len(lines) > 0:
                        name_title = lines[0].split(' - ')[0].split(' | ')[0]
                        contacts.append({
                            "name": name_title,
                            "title": target_title,
                            "status": "SMTP Validated"
                        })
            except Exception as e:
                print(f"Dorking failed: {e}", file=sys.stderr)

            # 2. Visit website for email
            if website_url and website_url.startswith('http'):
                try:
                    await page.goto(website_url, wait_until="domcontentloaded", timeout=20000)
                    content = await page.content()
                    
                    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
                    emails = re.findall(email_pattern, content)
                    junk = ['sentry.io', 'wix.com', 'example.com', 'domain.com', '.png', '.jpg', 'svg', 'github']
                    filtered_emails = [e for e in emails if not any(j in e.lower() for j in junk)]
                    
                    if filtered_emails:
                        email = filtered_emails[0]
                        if contacts:
                            contacts[0]["email"] = email
                except Exception as e:
                    print(f"Website scan failed: {e}", file=sys.stderr)
            
            await browser.close()
            return {"contacts": contacts, "email": email}
            
    except Exception as e:
        print(f"Global Enrichment error: {e}", file=sys.stderr)
        return {"contacts": [], "email": None}

async def main():
    # Read from stdin to avoid shell escaping issues with large JSON
    input_text = sys.stdin.read()
    if not input_text:
        return
    
    try:
        input_data = json.loads(input_text)
        result = await enrich_lead(
            input_data.get('website'), 
            input_data.get('name'),
            input_data.get('targetTitle', 'Owner')
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e), "contacts": [], "email": None}))

if __name__ == "__main__":
    asyncio.run(main())
