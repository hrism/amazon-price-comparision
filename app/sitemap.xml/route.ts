import { NextResponse } from 'next/server';
import { getBlogSitemap } from '@/lib/blog';

export async function GET() {
  const baseUrl = 'https://www.yasu-ku-kau.com';
  
  // ブログのURL一覧を取得
  const blogUrls = await getBlogSitemap();
  
  // 静的ページのURL
  const staticUrls = [
    {
      loc: baseUrl,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 1.0
    },
    {
      loc: `${baseUrl}/toilet-paper`,
      lastmod: new Date().toISOString(),
      changefreq: 'hourly',
      priority: 0.9
    },
    {
      loc: `${baseUrl}/dishwashing-liquid`,
      lastmod: new Date().toISOString(),
      changefreq: 'hourly',
      priority: 0.9
    },
    {
      loc: `${baseUrl}/blog`,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 0.8
    }
  ];
  
  // 全URLを結合
  const allUrls = [...staticUrls, ...blogUrls];
  
  // XML生成
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}