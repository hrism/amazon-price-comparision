import { NextRequest, NextResponse } from 'next/server';
import AmazonPAAPI from '@/lib/amazon-paapi';
import TextParser from '@/lib/text-parser';
import { supabase, Product } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const filter = searchParams.get('filter'); // single, double, sale

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // まずキャッシュを確認
    let query = supabase
      .from('products')
      .select('*')
      .ilike('title', `%${keyword}%`)
      .order('price_per_m', { ascending: true });

    // フィルタ適用
    if (filter === 'single') {
      query = query.eq('is_double', false);
    } else if (filter === 'double') {
      query = query.eq('is_double', true);
    } else if (filter === 'sale') {
      query = query.eq('on_sale', true);
    }

    const { data: cachedProducts, error: cacheError } = await query;

    // キャッシュが24時間以内なら返す
    if (cachedProducts && cachedProducts.length > 0) {
      const latestFetch = new Date(cachedProducts[0].last_fetched_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - latestFetch.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        return NextResponse.json(cachedProducts);
      }
    }

    // Amazon PA-APIから新規取得
    const amazonAPI = new AmazonPAAPI();
    const amazonProducts = await amazonAPI.searchItems(keyword);

    // テキスト解析
    const textParser = new TextParser();
    const productsToInsert: Product[] = [];

    for (const amazonProduct of amazonProducts) {
      const extractedInfo = await textParser.extractProductInfo(
        amazonProduct.title,
        amazonProduct.description
      );

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

    // Supabaseに保存（upsert）
    if (productsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('products')
        .upsert(productsToInsert, { onConflict: 'asin' });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
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

    return NextResponse.json(filteredProducts);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}