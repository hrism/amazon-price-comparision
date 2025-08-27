#!/usr/bin/env python
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.scrapers.mineral_water_scraper import scrape_mineral_water

async def main():
    print("Testing mineral water scraping...")
    products = await scrape_mineral_water()
    print(f"Found {len(products)} products")
    
    if products:
        print("\nSample product:")
        print(products[0])

if __name__ == "__main__":
    asyncio.run(main())