'use client';

import { useState } from 'react';
import { getAmazonProductUrl } from '@/lib/amazon-link';
import { productLabels } from '@/lib/labels';
import ShareModal from '@/components/ShareModal';

interface BaseProduct {
  asin: string;
  title: string;
  brand?: string;
  image_url?: string;
  price?: number;
  price_regular?: number;
  discount_percent?: number;
  on_sale: boolean;
  review_avg?: number;
  review_count?: number;
}

interface ProductCardProps<T extends BaseProduct> {
  product: T;
  index: number;
  sortBy: string;
  isLocalhost: boolean;
  refetchingProducts?: Set<string>;
  onRefetch?: (asin: string) => void;
  renderBadges: (product: T) => React.ReactNode;
  renderUnitPrice: (product: T) => React.ReactNode;
  renderProductDetails?: (product: T) => React.ReactNode;
  totalScore?: number;
}

export default function ProductCard<T extends BaseProduct>({
  product,
  index,
  sortBy,
  isLocalhost,
  refetchingProducts = new Set(),
  onRefetch,
  renderBadges,
  renderUnitPrice,
  renderProductDetails,
  totalScore,
}: ProductCardProps<T>) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  
  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return `¥${price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const isTopRanked = index < 3 && (sortBy === 'price_per_m' || sortBy === 'price_per_1000ml' || sortBy === 'price_per_liter' || sortBy === 'total_score');

  return (
    <div className="bg-white border border-[#D5D9D9] rounded-2xl p-4 relative hover:shadow-md transition-shadow">
      {isTopRanked && (
        <div className="absolute -top-2 -left-2 bg-[#FF9900] text-white font-bold text-[13px] rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
          {index + 1}位
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-2">
          <a
            href={getAmazonProductUrl(product.asin)}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-full max-w-[150px] max-h-[150px] object-contain mx-auto hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-full max-w-[150px] h-[150px] mx-auto bg-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-300 transition-colors">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </a>
        </div>

        <div className="md:col-span-6">
          <a
            href={getAmazonProductUrl(product.asin)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#C7511F] transition-colors"
          >
            <h3 className="text-[16px] font-normal mb-1 text-[#0F1111] hover:text-[#C7511F]">
              {product.title}
            </h3>
          </a>
          {product.brand && (
            <p className="text-[12px] text-[#565959] mb-1">
              {productLabels.product.brand}: <span className="text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">{product.brand}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {renderBadges(product)}
            {product.on_sale && (
              <span className="px-2 py-0.5 text-[11px] bg-[#CC0C39] text-white rounded-2xl">
                {productLabels.product.sale}
              </span>
            )}
          </div>
        </div>

        <div className="md:col-span-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-[#565959] mb-0.5">{productLabels.price.label}</p>
              <p className="text-[21px] font-normal text-[#0F1111] leading-tight">
                <span className="text-[13px]">¥</span>
                {product.price?.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </p>
              {product.price_regular && product.price_regular > (product.price || 0) && (
                <p className="text-[12px] text-[#565959] line-through">
                  {formatPrice(product.price_regular)}
                </p>
              )}
              {product.discount_percent && (
                <p className="text-[12px] text-[#CC0C39] font-normal">
                  {product.discount_percent}% {productLabels.product.discount}
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] text-[#565959] mb-0.5">{productLabels.price.unitPriceLabel}</p>
              {renderUnitPrice(product)}
              {totalScore !== undefined && (
                <div className="relative inline-flex items-center gap-1 mt-2">
                  <span className="px-2 py-0.5 text-[11px] bg-[#FFD814] text-[#0F1111] rounded-2xl border border-[#FCD200]">
                    総合: {totalScore.toFixed(2)}点
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowScoreTooltip(!showScoreTooltip)}
                    className="text-[#565959] hover:text-[#0F1111]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {showScoreTooltip && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-800 text-white text-[11px] rounded shadow-lg z-10">
                      <div className="text-[11px] leading-relaxed">
                        レビュー評価と単価を考慮した総合スコア（5点満点）
                      </div>
                      <div className="absolute top-full left-4 -mt-1">
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {renderProductDetails && (
            <div className="mt-2 text-[12px] text-[#565959]">
              {renderProductDetails(product)}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <a
              href={getAmazonProductUrl(product.asin)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-5 py-1.5 bg-[#FFD814] text-[#0F1111] text-[13px] rounded-2xl hover:bg-[#F7CA00] transition-colors border border-[#FCD200] shadow-sm"
            >
              {productLabels.cta.purchase}
              <svg className="ml-1.5 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 text-[13px] rounded-2xl transition-colors border shadow-sm bg-white text-[#0F1111] hover:bg-gray-50 border-[#D5D9D9]"
              aria-label="シェア"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="ml-1">シェア</span>
            </button>
            {isLocalhost && onRefetch && (
              <button
                onClick={() => onRefetch(product.asin)}
                disabled={refetchingProducts.has(product.asin)}
                className={`inline-flex items-center px-3 py-1.5 text-[13px] rounded-2xl transition-colors border shadow-sm ${
                  refetchingProducts.has(product.asin)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
                    : 'bg-[#007185] text-white hover:bg-[#005A6F] border-[#007185]'
                }`}
              >
                {refetchingProducts.has(product.asin) ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {productLabels.cta.refetching}
                  </>
                ) : (
                  <>
                    <svg className="mr-1.5 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {productLabels.cta.refetch}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={getAmazonProductUrl(product.asin)}
        title={product.title}
        description={`${product.brand ? product.brand + ' ' : ''}${product.title} - 安く買う.comで価格比較`}
      />
    </div>
  );
}