"use client";

import { useState } from "react";
import CircuitPathComparison from "@/components/CircuitPathComparison";
import VoltageWaveform from "@/components/VoltageWaveform";
import AnalysisPanel from "@/components/AnalysisPanel";
import SolutionPanel from "@/components/SolutionPanel";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"kl30" | "ps5v" | "analysis">("kl30");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-slate-900">
            MPS管脚峰值电压分析报告
          </h1>
          <p className="mt-2 text-slate-600">
            Myunghwa Wet DCT C0_1 MQ4 电路问题分析
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">KL30测试</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">14V</p>
              </div>
              <div className="text-blue-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">输入14V，峰值≈14V（无尖峰）</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">PS 5V测试</p>
                <p className="text-3xl font-bold text-red-600 mt-1">6.5V</p>
              </div>
              <div className="text-red-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">输入5V，峰值6.5V（+30%尖峰）</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">关键发现</p>
                <p className="text-2xl font-bold text-green-600 mt-1">测量点差异</p>
              </div>
              <div className="text-green-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">KL30在输入端，PS在输出端TP211</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-md mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("kl30")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "kl30"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                KL30路径（14V）
              </button>
              <button
                onClick={() => setActiveTab("ps5v")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "ps5v"
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                PS 5V路径
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "analysis"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                原因分析
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "kl30" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    KL30电路路径（14V输入，无尖峰）
                  </h3>
                  <CircuitPathComparison path="kl30" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    电压波形（KL30输入端测量）
                  </h3>
                  <VoltageWaveform type="kl30" />
                </div>
              </div>
            )}

            {activeTab === "ps5v" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    PS 5V电路路径（输出端TP211，有尖峰）
                  </h3>
                  <CircuitPathComparison path="ps5v" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    电压波形（TP211输出端测量）
                  </h3>
                  <VoltageWaveform type="ps5v" />
                </div>
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-6">
                <AnalysisPanel />
                <SolutionPanel />
              </div>
            )}
          </div>
        </div>

        {/* Key Components */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            关键电路元件
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-500">VT100A/B</div>
              <div className="text-lg font-bold text-slate-900">PUMD2</div>
              <div className="text-xs text-slate-600 mt-1">双NPN晶体管</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-500">VT101</div>
              <div className="text-lg font-bold text-slate-900">IPC100N04S5-1R2</div>
              <div className="text-xs text-slate-600 mt-1">MOSFET开关</div>
            </div>
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="text-sm font-medium text-red-600">V101</div>
              <div className="text-lg font-bold text-red-900">6V2</div>
              <div className="text-xs text-red-700 mt-1">6.2V稳压管（关键）</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-500">VS100</div>
              <div className="text-lg font-bold text-slate-900">SMAJ33CA</div>
              <div className="text-xs text-slate-600 mt-1">33V TVS保护</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
