"use client";

import { useState } from 'react';

export default function CleanupPage() {
  const [dbUrl, setDbUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    cleaned: number;
    skipped: number;
    errors: number;
    logs: string[];
  }>({ cleaned: 0, skipped: 0, errors: 0, logs: [] });

  const handleCleanup = async () => {
    if (!dbUrl || !authToken) {
      alert('请填写数据库 URL 和认证令牌');
      return;
    }

    setLoading(true);
    setResults({ cleaned: 0, skipped: 0, errors: 0, logs: ['正在连接数据库...'] });

    try {
      const response = await fetch('/api/cleanup-dataurl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dbUrl, authToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResults(prev => ({
          ...prev,
          logs: [...prev.logs, `错误：${data.error}`],
        }));
        return;
      }

      setResults({
        cleaned: data.cleaned,
        skipped: data.skipped,
        errors: data.errors,
        logs: data.logs,
      });
    } catch (error) {
      setResults(prev => ({
        ...prev,
        logs: [...prev.logs, `错误：${error}`],
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          照片数据清理工具
        </h1>

        {/* 功能说明 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">功能说明</h2>
          <p className="text-gray-600 mb-4">
            清理数据库中照片的 base64 数据（dataUrl），仅保留 S3 存储引用（s3Key）。
            这样可以大幅减小数据库大小，解决查询超时问题。
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>有 s3Key 的照片：删除 dataUrl（S3 已有完整图片）</li>
            <li>没有 s3Key 的照片：保留 dataUrl（无法自动迁移）</li>
          </ul>
        </div>

        {/* 配置表单 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">数据库配置</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Turso 数据库 URL
              </label>
              <input
                type="text"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                placeholder="libsql://xxx.turso.io"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                从 <a href="https://turso.tech" target="_blank" className="text-blue-600 hover:underline">turso.tech</a> 数据库页面获取
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                认证令牌（Auth Token）
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleCleanup}
              disabled={loading || !dbUrl || !authToken}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '正在清理...' : '开始清理'}
            </button>
          </div>
        </div>

        {/* 结果展示 */}
        {results.logs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">清理结果</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-md">
                <div className="text-sm text-green-600">已清理</div>
                <div className="text-2xl font-bold text-green-700">{results.cleaned}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-md">
                <div className="text-sm text-yellow-600">已跳过</div>
                <div className="text-2xl font-bold text-yellow-700">{results.skipped}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-md">
                <div className="text-sm text-red-600">错误</div>
                <div className="text-2xl font-bold text-red-700">{results.errors}</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {results.logs.join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
