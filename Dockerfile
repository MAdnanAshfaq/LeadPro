# Use Microsoft Playwright image as base (includes Python and Browser dependencies)
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy AS base

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

WORKDIR /app

# 1. Install Python requirements (Globally for the scraper/enricher)
COPY apps/scraper/requirements.txt ./scraper_reqs.txt
RUN pip install --no-cache-dir -r ./scraper_reqs.txt

# 2. Install Playwright Browsers
RUN playwright install chromium

# 3. Copy Monorepo structure
COPY . .

# 4. Install Node dependencies and build
RUN npm install
RUN npx turbo run build --filter=api...

# Environment Config
ENV NODE_ENV=production
ENV PORT=4000

# We run the API app from the root context
WORKDIR /app/apps/api
EXPOSE 4000

CMD ["npm", "start"]
