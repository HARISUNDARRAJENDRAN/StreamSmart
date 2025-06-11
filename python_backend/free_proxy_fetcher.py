#!/usr/bin/env python3
"""
Free Proxy Fetcher for YouTube Access
Automatically fetches and tests free proxies
"""

import requests
import random
import time
import logging
from typing import List, Optional
import concurrent.futures
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class FreeProxyFetcher:
    def __init__(self):
        self.working_proxies = []
        self.tested_proxies = set()
        
    def fetch_free_proxies(self) -> List[str]:
        """Fetch free proxies from multiple sources"""
        proxies = []
        
        # Source 1: ProxyList.geonode.com (usually reliable)
        try:
            response = requests.get(
                "https://proxylist.geonode.com/api/proxy-list",
                params={
                    "limit": 50,
                    "page": 1,
                    "sort_by": "lastChecked",
                    "sort_type": "desc",
                    "protocols": "http,https"
                },
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                for proxy in data.get('data', []):
                    if proxy.get('protocols'):
                        proxy_url = f"http://{proxy['ip']}:{proxy['port']}"
                        proxies.append(proxy_url)
                        logger.info(f"Found proxy from geonode: {proxy_url}")
        except Exception as e:
            logger.warning(f"Failed to fetch from geonode: {e}")
        
        # Source 2: Free-proxy-list.net API
        try:
            response = requests.get(
                "https://www.proxy-list.download/api/v1/get?type=http&anon=elite",
                timeout=10
            )
            if response.status_code == 200:
                proxy_list = response.text.strip().split('\n')
                for proxy in proxy_list[:20]:  # Limit to 20
                    if ':' in proxy and proxy not in self.tested_proxies:
                        proxy_url = f"http://{proxy.strip()}"
                        proxies.append(proxy_url)
                        logger.info(f"Found proxy from proxy-list: {proxy_url}")
        except Exception as e:
            logger.warning(f"Failed to fetch from proxy-list: {e}")
        
        # Source 3: Hardcoded list of sometimes-working free proxies
        free_proxy_list = [
            "http://103.216.207.15:8080",
            "http://8.210.83.33:80",
            "http://47.74.152.29:8888",
            "http://103.149.162.194:80",
            "http://185.162.251.76:80",
            "http://20.111.54.16:8123",
            "http://103.127.1.130:80",
            "http://189.240.60.164:9090",
            "http://103.178.42.58:8181",
            "http://103.155.54.26:83"
        ]
        
        proxies.extend(free_proxy_list)
        
        # Remove duplicates and return
        unique_proxies = list(set(proxies))
        logger.info(f"Total unique proxies collected: {len(unique_proxies)}")
        return unique_proxies
    
    def test_proxy_for_youtube(self, proxy_url: str) -> bool:
        """Test if a proxy can access YouTube"""
        try:
            # Test with a simple YouTube API call
            test_url = "https://www.googleapis.com/youtube/v3/videos"
            test_params = {
                'part': 'snippet',
                'id': 'dQw4w9WgXcQ',  # Rick Roll video ID (always exists)
                'key': 'test'  # Will fail but tells us if we can reach YouTube
            }
            
            proxies = {
                'http': proxy_url,
                'https': proxy_url
            }
            
            response = requests.get(
                test_url,
                params=test_params,
                proxies=proxies,
                timeout=15,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
            
            # Even if API key is invalid, if we get a response from YouTube, proxy works
            if response.status_code in [400, 403]:  # YouTube responded with auth error
                logger.info(f"✅ Proxy works for YouTube: {proxy_url}")
                return True
            
        except Exception as e:
            logger.warning(f"❌ Proxy failed: {proxy_url} - {str(e)[:50]}")
            
        return False
    
    def find_working_proxies(self, max_proxies: int = 5) -> List[str]:
        """Find working proxies for YouTube access"""
        logger.info("🔍 Fetching free proxies...")
        all_proxies = self.fetch_free_proxies()
        
        if not all_proxies:
            logger.error("No proxies found from any source")
            return []
        
        logger.info(f"🧪 Testing {len(all_proxies)} proxies for YouTube access...")
        working_proxies = []
        
        # Test proxies in parallel for speed
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_proxy = {
                executor.submit(self.test_proxy_for_youtube, proxy): proxy 
                for proxy in random.sample(all_proxies, min(len(all_proxies), 30))
            }
            
            for future in concurrent.futures.as_completed(future_to_proxy):
                proxy = future_to_proxy[future]
                try:
                    if future.result() and len(working_proxies) < max_proxies:
                        working_proxies.append(proxy)
                        logger.info(f"✅ Added working proxy {len(working_proxies)}/{max_proxies}: {proxy}")
                except Exception as e:
                    logger.warning(f"Error testing {proxy}: {e}")
        
        self.working_proxies = working_proxies
        return working_proxies
    
    def get_proxy_list_string(self) -> str:
        """Get comma-separated proxy list for environment variable"""
        return ",".join(self.working_proxies)

def main():
    """Test the proxy fetcher"""
    logging.basicConfig(level=logging.INFO)
    
    fetcher = FreeProxyFetcher()
    working_proxies = fetcher.find_working_proxies(max_proxies=3)
    
    if working_proxies:
        print(f"\n🎉 Found {len(working_proxies)} working proxies!")
        print(f"\nAdd this to your Render environment variables:")
        print(f"PROXY_LIST={fetcher.get_proxy_list_string()}")
        print(f"ROTATING_PROXY_ENABLED=true")
        
        print(f"\nWorking proxies:")
        for i, proxy in enumerate(working_proxies, 1):
            print(f"{i}. {proxy}")
    else:
        print("❌ No working proxies found. Try running again or use a paid service.")

if __name__ == "__main__":
    main() 