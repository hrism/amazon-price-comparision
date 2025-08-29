import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* サイト情報 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">安く買う.com</h3>
            <p className="text-sm text-gray-600">
              Amazonの日用品を単価で比較し、本当にお得な商品を見つけるお手伝いをします。
            </p>
          </div>

          {/* カテゴリリンク */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">商品カテゴリ</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/toilet-paper" className="text-sm text-gray-600 hover:text-blue-600">
                  トイレットペーパー価格比較
                </Link>
              </li>
              <li>
                <Link href="/dishwashing-liquid" className="text-sm text-gray-600 hover:text-blue-600">
                  食器用洗剤価格比較
                </Link>
              </li>
              <li>
                <Link href="/mineral-water" className="text-sm text-gray-600 hover:text-blue-600">
                  ミネラルウォーター価格比較
                </Link>
              </li>
              <li>
                <Link href="/rice" className="text-sm text-gray-600 hover:text-blue-600">
                  米価格比較
                </Link>
              </li>
            </ul>
          </div>

          {/* お問い合わせ・SNS */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">お問い合わせ</h3>
            <p className="text-sm text-gray-600 mb-4">
              info(at)yasu-ku-kau.com
            </p>
            <div className="flex space-x-4">
              <a
                href="https://x.com/yasu_ku_kau"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900"
                aria-label="X (Twitter)"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* コピーライト */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            © 2024 安く買う.com - 賢い買い物をサポート
          </p>
        </div>
      </div>
    </footer>
  );
}