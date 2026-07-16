"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, QrCode, Monitor, Smartphone } from "lucide-react";

export function QRCodeModal() {
  const [open, setOpen] = useState(false);
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
        title="扫码进入"
      >
        <QrCode className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">手机扫码进入</h3>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex justify-center py-4">
          <div className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-inner">
            <QRCodeSVG
              value={appUrl}
              size={200}
              level="M"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#111827"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <span>用手机浏览器扫描二维码即可进入</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Monitor className="w-4 h-4 text-green-500" />
            <span>
              电脑端访问：
              <a
                href="/records"
                className="text-blue-600 hover:underline font-medium"
              >
                查看保养记录
              </a>
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center break-all">
            {appUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
