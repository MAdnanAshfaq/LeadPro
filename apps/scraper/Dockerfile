FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install stealth separately if not in requirements or ensure it's picked up
RUN pip install playwright-stealth bullmq

COPY . .

# Run the bullmq worker
CMD ["python", "worker.py"]
