#!/usr/bin/env python3
"""
公開中のブログ記事を確認するスクリプト
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# .envファイルから環境変数を読み込む
load_dotenv()

# Supabaseクライアントの初期化
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in environment variables")
    exit(1)

supabase: Client = create_client(url, key)

def check_published_posts():
    """公開中のブログ記事を確認"""
    
    now = datetime.now().isoformat()
    
    # 公開中の記事を取得（publishedまたはscheduledでpublished_atが現在時刻より前）
    result = supabase.table("blog_posts").select(
        "id, title, slug, status, published_at, created_at"
    ).eq("status", "published").order(
        "published_at", desc=True
    ).execute()
    
    posts = result.data
    
    print(f"=== 公開中のブログ記事: {len(posts)}件 ===\n")
    
    if posts:
        for i, post in enumerate(posts, 1):
            print(f"{i}. {post['title']}")
            print(f"   Slug: {post['slug']}")
            print(f"   Status: {post['status']}")
            print(f"   Published: {post['published_at']}")
            print(f"   URL: https://www.yasu-ku-kau.com/blog/{post['slug']}")
            print()
    
    # Sitemapの記事と比較
    sitemap_urls = [
        "amazon-toilet-paper-tips",
        "bichikumai-zuikei-keiyaku",
        "buy-toilet-paper-reasonable",
        "costco-toilet-paper-kirkland",
        "eliel-toilet-paper-price-compare-2025",
        "frosch-cost-performance",
        "japan-rice-price-mechanism-gentan-ja-tariff",
        "japan-toilet-paper-market-history-competition-1945-2025",
        "kleenex-toilet-paper-vs-elleair",
        "nepia-brand-snowman-meguro-ren",
        "rice-gaisankin-system-2025",
        "rice-price-comparison-2025",
        "rice-price-surge-ja-maff-truth-2025",
        "toilet-paper-best-price-compare",
        "toilet-paper-history",
        "toilet-paper-panic-history"
    ]
    
    print("=== 差分チェック ===\n")
    
    db_slugs = [post['slug'] for post in posts]
    
    # Sitemapに含まれているがDBにない記事
    in_sitemap_not_in_db = [slug for slug in sitemap_urls if slug not in db_slugs]
    if in_sitemap_not_in_db:
        print("⚠️ Sitemapに含まれているがDBにない記事:")
        for slug in in_sitemap_not_in_db:
            print(f"  - {slug}")
        print()
    
    # DBにあるがSitemapに含まれていない記事
    in_db_not_in_sitemap = [slug for slug in db_slugs if slug not in sitemap_urls]
    if in_db_not_in_sitemap:
        print("❌ DBにあるがSitemapに含まれていない記事:")
        for slug in in_db_not_in_sitemap:
            print(f"  - {slug}")
        print()
    
    if not in_sitemap_not_in_db and not in_db_not_in_sitemap:
        print("✅ すべての公開記事がSitemapに正しく含まれています")

if __name__ == "__main__":
    check_published_posts()