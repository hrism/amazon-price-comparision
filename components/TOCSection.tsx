'use client';

import { TOCItem } from '@/lib/blog-utils';

interface TOCSectionProps {
  toc: TOCItem[];
  readingTimeMinutes: number;
}

export default function TOCSection({ toc, readingTimeMinutes }: TOCSectionProps) {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // ヘッダーの高さ分のオフセット
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">目次</h2>
        <span className="text-xs text-gray-500">
          読了時間: 約{readingTimeMinutes}分
        </span>
      </div>
      <nav className="space-y-1 text-sm">
        {toc.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => scrollToSection(e, item.id)}
            className={`block hover:text-blue-600 transition-colors ${
              item.level === 2 
                ? 'text-gray-700 pl-0' 
                : 'text-gray-600 text-xs pl-3'
            }`}
          >
            {item.level === 3 && '• '}{item.text}
          </a>
        ))}
      </nav>
    </div>
  );
}