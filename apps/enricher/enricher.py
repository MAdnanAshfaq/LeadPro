import asyncio
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import httpx

# Pre-compile regex for emails and socials
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
SOCIAL_DOMAINS = ["linkedin.com", "twitter.com", "facebook.com", "instagram.com"]

async def enrich_website(url: str):
    print(f"Starting enrichment for: {url}")
    results = {
        "email": None,
        "socialLinks": []
    }
    
    if not url.startswith("http"):
        url = "http://" + url
        
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # 1. Extract Emails from text
                emails = EMAIL_REGEX.findall(soup.get_text())
                
                # Also check mailto: links
                for a_tag in soup.find_all('a', href=True):
                    href = a_tag['href']
                    if href.startswith('mailto:'):
                        emails.append(href.replace('mailto:', '').split('?')[0])
                        
                    # 2. Extract Social Links
                    for domain in SOCIAL_DOMAINS:
                        if domain in href and href not in results["socialLinks"]:
                            results["socialLinks"].append(href)
                            
                if emails:
                    results["email"] = emails[0] # Just take the first valid email found
                    
    except Exception as e:
        print(f"Failed to enrich {url}: {e}")
        
    print(f"Enrichment complete for {url}: {results}")
    return results

if __name__ == "__main__":
    # Test locally
    asyncio.run(enrich_website("https://example.com"))
