"""
マスクサイズ・カラーのメモリキャッシュ
データベースにmask_size、mask_colorカラムが追加されるまでの一時的な対応
"""

# ASINごとのmask_sizeとmask_colorを保存
mask_cache = {}

def update_mask_size_cache(products):
    """マスクキャッシュを更新（サイズとカラー両方）"""
    for product in products:
        asin = product['asin']
        cache_data = {}
        
        if product.get('mask_size'):
            cache_data['mask_size'] = product['mask_size']
        if product.get('mask_color'):
            cache_data['mask_color'] = product['mask_color']
            
        if cache_data:
            if asin not in mask_cache:
                mask_cache[asin] = {}
            mask_cache[asin].update(cache_data)

def get_mask_size(asin):
    """ASINからマスクサイズを取得"""
    return mask_cache.get(asin, {}).get('mask_size')

def get_mask_color(asin):
    """ASINからマスクカラーを取得"""
    return mask_cache.get(asin, {}).get('mask_color')

def apply_mask_sizes(products):
    """商品リストにマスクサイズとカラーを適用"""
    for product in products:
        asin = product['asin']
        if asin in mask_cache:
            cache_data = mask_cache[asin]
            if 'mask_size' in cache_data:
                product['mask_size'] = cache_data['mask_size']
            if 'mask_color' in cache_data:
                product['mask_color'] = cache_data['mask_color']
    return products