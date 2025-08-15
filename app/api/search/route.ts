import { NextRequest, NextResponse } from 'next/server';
import AmazonScraperServer from '@/lib/amazon-scraper-server';
import TextParser from '@/lib/text-parser';
import GPTTextParser from '@/lib/gpt-text-parser';
import { Product } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const filter = searchParams.get('filter'); // single, double, sale
    const force = searchParams.get('force') === 'true'; // 強制的に新規取得

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // まずキャッシュを確認
    // キーワードが"トイレットペーパー"の場合は全商品を取得
    let query = supabase
      .from('products')
      .select('*');
      
    if (keyword !== 'トイレットペーパー') {
      query = query.ilike('title', `%${keyword}%`);
    }
    
    query = query.order('price_per_m', { ascending: true });

    // フィルタ適用
    if (filter === 'single') {
      query = query.eq('is_double', false);
    } else if (filter === 'double') {
      query = query.eq('is_double', true);
    } else if (filter === 'sale') {
      query = query.eq('on_sale', true);
    }

    const { data: cachedProducts, error: cacheError } = await query;

    console.log('Cache check - Found products:', cachedProducts?.length || 0);
    console.log('Force parameter:', force);
    
    // キャッシュが1時間以内なら返す（forceパラメータがない場合）
    if (!force && cachedProducts && cachedProducts.length > 0) {
      const latestFetch = new Date(cachedProducts[0].last_fetched_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - latestFetch.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 1) {
        console.log('Returning cached products:', cachedProducts.length);
        return NextResponse.json(cachedProducts);
      }
    }

    console.log('Starting fresh scrape...');
    
    // Amazonからスクレイピングで新規取得
    const scraper = new AmazonScraperServer();
    const amazonProducts = await scraper.searchProducts(keyword);
    
    console.log('Scraper returned products:', amazonProducts.length);
    
    // スクレイピング終了後にブラウザを閉じる
    await scraper.close();

    // テキスト解析
    const textParser = new TextParser();
    const gptParser = new GPTTextParser();
    const productsToInsert: Product[] = [];
    const seenAsins = new Set<string>();
    let gptUsageCount = 0;

    for (const amazonProduct of amazonProducts) {
      // Skip duplicate ASINs
      if (seenAsins.has(amazonProduct.asin)) {
        continue;
      }
      seenAsins.add(amazonProduct.asin);
      
      let extractedInfo;
      try {
        // まずKuromojiで試す
        extractedInfo = await textParser.extractProductInfo(
          amazonProduct.title,
          amazonProduct.description
        );
        
        // 単価計算に必要な情報が不足している場合、GPTを使用
        if (!extractedInfo.rollCount || !extractedInfo.lengthM) {
          console.log(`Kuromoji failed for ${amazonProduct.asin}, using GPT...`);
          extractedInfo = await gptParser.extractProductInfo(
            amazonProduct.title,
            amazonProduct.description
          );
          gptUsageCount++;
        }
      } catch (error) {
        console.error('Text extraction error for product:', amazonProduct.asin, error);
        extractedInfo = {
          rollCount: null,
          lengthM: null,
          totalLengthM: null,
          isDouble: null
        };
      }

      // 単価計算
      let pricePerRoll = null;
      let pricePerM = null;

      if (amazonProduct.price && extractedInfo.rollCount) {
        pricePerRoll = amazonProduct.price / extractedInfo.rollCount;
      }

      if (amazonProduct.price && extractedInfo.totalLengthM) {
        pricePerM = amazonProduct.price / extractedInfo.totalLengthM;
      }

      const product: Product = {
        asin: amazonProduct.asin,
        title: amazonProduct.title,
        description: amazonProduct.description,
        brand: amazonProduct.brand,
        image_url: amazonProduct.imageUrl,
        price: amazonProduct.price,
        price_regular: amazonProduct.priceRegular,
        discount_percent: amazonProduct.discountPercent,
        on_sale: amazonProduct.onSale,
        review_avg: amazonProduct.reviewAvg,
        review_count: amazonProduct.reviewCount,
        roll_count: extractedInfo.rollCount || undefined,
        length_m: extractedInfo.lengthM || undefined,
        total_length_m: extractedInfo.totalLengthM || undefined,
        price_per_roll: pricePerRoll || undefined,
        price_per_m: pricePerM || undefined,
        is_double: extractedInfo.isDouble || undefined,
        last_fetched_at: new Date().toISOString()
      };

      productsToInsert.push(product);
    }

    console.log('Products to insert:', productsToInsert.length);
    console.log('GPT API usage count:', gptUsageCount);
    
    // Supabaseに保存（upsert）
    if (productsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('products')
        .upsert(productsToInsert, { onConflict: 'asin' });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
      } else {
        console.log('Successfully upserted products to Supabase');
      }
    }

    // フィルタを適用して返す
    let filteredProducts = productsToInsert;
    if (filter === 'single') {
      filteredProducts = productsToInsert.filter(p => p.is_double === false);
    } else if (filter === 'double') {
      filteredProducts = productsToInsert.filter(p => p.is_double === true);
    } else if (filter === 'sale') {
      filteredProducts = productsToInsert.filter(p => p.on_sale === true);
    }

    // 価格でソート
    filteredProducts.sort((a, b) => {
      if (a.price_per_m && b.price_per_m) {
        return a.price_per_m - b.price_per_m;
      }
      return 0;
    });

    // デバッグモードの場合、詳細情報を含める
    const debugMode = searchParams.get('debug') === 'true';
    
    if (debugMode) {
      return NextResponse.json({
        products: filteredProducts,
        debug: {
          totalScraped: amazonProducts.length,
          totalProcessed: productsToInsert.length,
          totalFiltered: filteredProducts.length,
          sampleExtraction: productsToInsert.slice(0, 3).map(p => ({
            title: p.title,
            rollCount: p.roll_count,
            lengthM: p.length_m,
            totalLengthM: p.total_length_m,
            pricePerM: p.price_per_m,
            isDouble: p.is_double
          }))
        }
      });
    }
    
    return NextResponse.json(filteredProducts);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}