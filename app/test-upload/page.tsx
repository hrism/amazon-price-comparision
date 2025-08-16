'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestUploadPage() {
  const [status, setStatus] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const checkBucket = async () => {
    try {
      setStatus('バケットを確認中...');
      
      // テストファイルのリストを試みることでバケットの存在を確認
      const { data, error } = await supabase.storage
        .from('images')
        .list('', { limit: 1 });
      
      if (error) {
        if (error.message.includes('not found')) {
          setStatus('⚠️ imagesバケットが存在しません');
        } else {
          setStatus(`エラー: ${error.message}`);
        }
        return;
      }
      
      setStatus('✅ imagesバケットが存在し、アクセス可能です');
    } catch (err: any) {
      setStatus(`エラー: ${err.message}`);
    }
  };

  const createBucket = async () => {
    setStatus('バケットはSupabaseダッシュボードから作成済みです');
  };

  const testUpload = async () => {
    try {
      setStatus('テスト画像をアップロード中...');
      
      // テスト用の画像を作成（1x1の透明PNG）
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TEST', 50, 50);
      }
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setStatus('画像の生成に失敗しました');
          return;
        }
        
        const file = new File([blob], 'test-image.png', { type: 'image/png' });
        const fileName = `test-${Date.now()}.png`;
        const filePath = `blog-images/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);
        
        if (uploadError) {
          setStatus(`アップロードエラー: ${uploadError.message}`);
          return;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        
        setImageUrl(publicUrl);
        setStatus('✅ アップロード成功！');
      }, 'image/png');
    } catch (err: any) {
      setStatus(`エラー: ${err.message}`);
    }
  };

  const deleteTestImages = async () => {
    try {
      setStatus('テスト画像を削除中...');
      
      const { data: files, error: listError } = await supabase.storage
        .from('images')
        .list('blog-images', {
          limit: 100,
          offset: 0
        });
      
      if (listError) {
        setStatus(`リスト取得エラー: ${listError.message}`);
        return;
      }
      
      if (!files || files.length === 0) {
        setStatus('削除する画像がありません');
        return;
      }
      
      const testFiles = files
        .filter(f => f.name.startsWith('test-'))
        .map(f => `blog-images/${f.name}`);
      
      if (testFiles.length === 0) {
        setStatus('テスト画像がありません');
        return;
      }
      
      const { error: deleteError } = await supabase.storage
        .from('images')
        .remove(testFiles);
      
      if (deleteError) {
        setStatus(`削除エラー: ${deleteError.message}`);
        return;
      }
      
      setStatus(`✅ ${testFiles.length}個のテスト画像を削除しました`);
      setImageUrl('');
    } catch (err: any) {
      setStatus(`エラー: ${err.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">画像アップロードテスト</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={checkBucket}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            バケット確認
          </button>
          
          <button
            onClick={testUpload}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            テストアップロード
          </button>
          
          <button
            onClick={deleteTestImages}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            テスト画像削除
          </button>
        </div>
        
        {status && (
          <div className="p-4 bg-gray-100 rounded">
            <p className="text-sm">{status}</p>
          </div>
        )}
        
        {imageUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium">アップロードされた画像:</p>
            <img src={imageUrl} alt="Test upload" className="border rounded" />
            <p className="text-xs text-gray-600 break-all">{imageUrl}</p>
          </div>
        )}
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="font-bold mb-2">手順:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>「バケット確認」をクリックして、imagesバケットの存在を確認</li>
          <li>バケットがない場合は自動作成を試みます</li>
          <li>「テストアップロード」でテスト画像をアップロード</li>
          <li>成功したら画像が表示されます</li>
          <li>「テスト画像削除」で不要なテスト画像を削除</li>
        </ol>
        
        <div className="mt-4">
          <p className="text-sm font-medium mb-1">Supabaseダッシュボードでの手動作成が必要な場合:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
            <li>Supabaseダッシュボードにログイン</li>
            <li>Storage → New bucket</li>
            <li>Name: images, Public: ON</li>
            <li>作成後、RLSポリシーを設定（全員読み取り可能）</li>
          </ol>
        </div>
      </div>
    </div>
  );
}