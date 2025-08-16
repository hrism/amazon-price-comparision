'use client';

import { useState, useEffect } from 'react';

interface ReviewFilterProps {
  value: number;
  onChange: (value: number) => void;
  productCount?: number;
}

export default function ReviewFilter({ value, onChange, productCount }: ReviewFilterProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
  };

  const handleSliderEnd = () => {
    onChange(localValue);
  };

  const presetValues = [0, 3.0, 3.5, 4.0, 4.5];

  const getStarDisplay = (rating: number) => {
    if (rating === 0) return 'すべて';
    return `★${rating.toFixed(1)}以上`;
  };

  return (
    <div className="relative">
      {/* モバイル用ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden px-3 py-1.5 text-[13px] border border-[#D5D9D9] rounded-2xl bg-[#F0F2F2] hover:bg-[#E3E6E6] flex items-center gap-1"
      >
        <span className="text-[#FF9900]">★</span>
        <span>{value === 0 ? 'すべて' : `${value.toFixed(1)}以上`}</span>
        <svg 
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* デスクトップ用インライン表示 */}
      <div className="hidden md:block min-w-[280px]">
        <label className="block text-[11px] font-normal text-[#565959] mb-1">
          レビュー評価
        </label>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {presetValues.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setLocalValue(preset);
                  onChange(preset);
                }}
                className={`px-2 py-1 text-[12px] rounded-lg transition-colors ${
                  value === preset
                    ? 'bg-[#FF9900] text-white'
                    : 'bg-[#F0F2F2] hover:bg-[#E3E6E6] text-[#0F1111]'
                }`}
              >
                {getStarDisplay(preset)}
              </button>
            ))}
          </div>
          
          {/* カスタムスライダー */}
          <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-[#F7F8FA] rounded-xl">
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={localValue}
              onChange={handleSliderChange}
              onMouseUp={handleSliderEnd}
              onTouchEnd={handleSliderEnd}
              className="w-24 h-1 bg-[#D5D9D9] rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #FF9900 0%, #FF9900 ${(localValue / 5) * 100}%, #D5D9D9 ${(localValue / 5) * 100}%, #D5D9D9 100%)`
              }}
            />
            <span className="text-[12px] text-[#0F1111] min-w-[2.5rem] text-center">
              {localValue === 0 ? 'すべて' : localValue.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* モバイル用ドロップダウン */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 mt-1 w-72 bg-white border border-[#D5D9D9] rounded-xl shadow-lg z-50 p-4">
          <div className="space-y-3">
            <div className="text-[13px] font-medium text-[#0F1111] mb-2">レビュー評価でフィルター</div>
            
            {/* プリセットボタン */}
            <div className="grid grid-cols-3 gap-2">
              {presetValues.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setLocalValue(preset);
                    onChange(preset);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-[13px] rounded-lg transition-colors ${
                    value === preset
                      ? 'bg-[#FF9900] text-white'
                      : 'bg-[#F0F2F2] text-[#0F1111]'
                  }`}
                >
                  {getStarDisplay(preset)}
                </button>
              ))}
            </div>

            {/* スライダー */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px] text-[#565959]">
                <span>カスタム設定</span>
                <span className="text-[#FF9900] font-medium">
                  {localValue === 0 ? 'すべて' : `★${localValue.toFixed(1)}以上`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={localValue}
                onChange={handleSliderChange}
                className="w-full h-2 bg-[#D5D9D9] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #FF9900 0%, #FF9900 ${(localValue / 5) * 100}%, #D5D9D9 ${(localValue / 5) * 100}%, #D5D9D9 100%)`
                }}
              />
              <div className="flex justify-between text-[11px] text-[#565959]">
                <span>0.0</span>
                <span>2.5</span>
                <span>5.0</span>
              </div>
            </div>

            {/* 適用ボタン */}
            <button
              onClick={() => {
                onChange(localValue);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 bg-[#FFD814] text-[#0F1111] text-[13px] rounded-2xl hover:bg-[#F7CA00] transition-colors border border-[#FCD200]"
            >
              適用する
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #FF9900;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #FF9900;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        @media (max-width: 768px) {
          input[type="range"]::-webkit-slider-thumb {
            width: 20px;
            height: 20px;
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
    </div>
  );
}