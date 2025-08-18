import Link from 'next/link';
import { Category } from '@/lib/categories';

interface CategoryGridProps {
  categories: Category[];
  currentCategory?: string;
  title?: string;
  subtitle?: string;
}

export default function CategoryGrid({ 
  categories, 
  currentCategory,
  title = "他のカテゴリーも見る",
  subtitle = "Amazon商品を単価で比較して、本当にお得な商品を見つけましょう"
}: CategoryGridProps) {
  // 現在のカテゴリーを除外
  const filteredCategories = currentCategory 
    ? categories.filter(cat => cat.href !== currentCategory)
    : categories;

  return (
    <div className="mt-16 pt-8 border-t border-gray-200">
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-[#0F1111] mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[#565959] text-sm">
            {subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <div
            key={category.href}
            className={`relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 ${
              category.available ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : 'opacity-75'
            }`}
          >
            {category.available ? (
              <Link href={category.href} className="block p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{category.icon}</div>
                  {category.available && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      利用可能
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {category.title}
                </h3>
                <p className="text-gray-600 text-xs mb-3">
                  {category.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{category.stats.products} 商品</span>
                  <span>{category.stats.updated}</span>
                </div>
                <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                  比較を開始
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl opacity-50">{category.icon}</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    準備中
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 opacity-75">
                  {category.title}
                </h3>
                <p className="text-gray-500 text-xs mb-3">
                  {category.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{category.stats.products}</span>
                  <span>{category.stats.updated}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}