"""
マスクサイズのメモリキャッシュ
データベースにmask_sizeカラムが追加されるまでの一時的な対応
"""

# ASINごとのmask_sizeを保存
mask_size_cache = {}

def update_mask_size_cache(products):
    """マスクサイズキャッシュを更新"""
    for product in products:
        if product.get('mask_size'):
            mask_size_cache[product['asin']] = product['mask_size']

def get_mask_size(asin):
    """ASINからマスクサイズを取得"""
    return mask_size_cache.get(asin)

def apply_mask_sizes(products):
    """商品リストにマスクサイズを適用"""
    for product in products:
        if product['asin'] in mask_size_cache:
            product['mask_size'] = mask_size_cache[product['asin']]
    return products