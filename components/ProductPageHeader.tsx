interface ProductPageHeaderProps {
  title: string;
  description: string;
  tip: string;
}

export default function ProductPageHeader({ title, description, tip }: ProductPageHeaderProps) {
  const partnerTag = process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || 'electlicdista-22';
  
  return (
    <div className="mb-6 text-left border-b border-gray-300 pb-4">
      <div className="flex items-center gap-3 mb-2">
        <a 
          href={`https://www.amazon.co.jp/?tag=${partnerTag}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block"
        >
          <img 
            src="/amazon-logo.svg" 
            alt="Amazon.co.jp" 
            className="h-8 w-auto"
          />
        </a>
        <h1 className="text-2xl font-normal" style={{ color: '#0F1111' }}>
          {title}
        </h1>
      </div>
      <div className="text-sm space-y-2" style={{ color: '#565959' }}>
        <p>{description}</p>
        <p className="text-xs">
          💡 ポイント：{tip}
        </p>
      </div>
    </div>
  );
}