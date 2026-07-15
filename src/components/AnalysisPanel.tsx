"use client";

export default function AnalysisPanel() {
  return (
    <div className="space-y-6">
      {/* Root Cause */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-200">
        <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          根本原因分析
        </h3>
        
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <h4 className="font-bold text-slate-900 mb-2">原因一：测量点位置差异（主要）</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start">
                <span className="text-blue-600 font-bold mr-2">•</span>
                <span><strong>KL30测试：</strong>示波器探头接在输入端（TP101附近），测量的是输入电压，不经过VT100A/B的开关回路</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 font-bold mr-2">•</span>
                <span><strong>PS 5V测试：</strong>示波器探头接在输出端TP211，经过了整个继电器驱动回路，必然看到开关瞬态</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
            <h4 className="font-bold text-slate-900 mb-2">原因二：VT100A/B开关瞬态</h4>
            <div className="text-sm text-slate-700 space-y-2">
              <p>PUMD2是双NPN晶体管，在开关切换时：</p>
              <div className="bg-slate-50 rounded p-3 font-mono text-xs">
                <p>关断瞬间：</p>
                <p>1. 基极电流切断</p>
                <p>2. 集电极电流快速下降 (dt → 0)</p>
                <p>3. 产生电压瞬态 V = L × (di/dt)</p>
              </div>
              <p>这里的"L"来自PCB走线寄生电感、元件引线电感、连接线缆电感</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
            <h4 className="font-bold text-slate-900 mb-2">原因三：V101(6.2V)稳压管钳位</h4>
            <div className="text-sm text-slate-700 space-y-2">
              <p>当VT100A关断产生瞬态电压超过6.2V时：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>V101开始导通，吸收能量</li>
                <li>由于动态电阻（约10-30Ω），实际钳位电压偏高0.3-0.5V</li>
                <li>最终稳定在6.5V左右</li>
              </ul>
              <div className="bg-orange-50 rounded p-3 mt-2">
                <p className="font-bold text-orange-900">关键证据：</p>
                <p>V101规格：6.2V → 实测峰值：6.5V → 差值：0.3V（符合稳压管动态电阻特性）</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg p-6 border border-slate-200">
        <h3 className="text-xl font-bold text-slate-900 mb-4">两种测试路径对比</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">对比项</th>
                <th className="px-4 py-3 text-left font-semibold text-blue-700">KL30测试（14V）</th>
                <th className="px-4 py-3 text-left font-semibold text-red-700">PS 5V测试</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-3 font-medium">输入电压</td>
                <td className="px-4 py-3">14V</td>
                <td className="px-4 py-3">5V</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">测量峰值</td>
                <td className="px-4 py-3 text-blue-600 font-bold">~14V（无尖峰）</td>
                <td className="px-4 py-3 text-red-600 font-bold">6.5V（+30%尖峰）</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">测量点位置</td>
                <td className="px-4 py-3">输入端（可能）</td>
                <td className="px-4 py-3">输出端TP211</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">经过回路</td>
                <td className="px-4 py-3">不经过开关电路</td>
                <td className="px-4 py-3">经过完整继电器回路</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">TVS/稳压管</td>
                <td className="px-4 py-3">VS100(33V)不动作</td>
                <td className="px-4 py-3">V101(6.2V)参与钳位</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">滤波电容</td>
                <td className="px-4 py-3">270μF大电容</td>
                <td className="px-4 py-3">C120(100nF小电容)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">看到瞬态</td>
                <td className="px-4 py-3 text-green-600 font-bold">否</td>
                <td className="px-4 py-3 text-red-600 font-bold">是</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Method */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          验证方法
        </h3>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="bg-white rounded-lg p-4">
            <p className="font-bold text-blue-900 mb-2">测试1：改变KL30测量位置</p>
            <p>将示波器探头从输入端移到VT101输出端（TP104或类似位置）</p>
            <p className="text-green-700 mt-1">预期：应该也能看到开关瞬态（如果有开关动作）</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="font-bold text-blue-900 mb-2">测试2：改变PS 5V测量位置</p>
            <p>将示波器探头从TP211移到PS 5V输入端</p>
            <p className="text-green-700 mt-1">预期：应该看不到瞬态，峰值接近5V</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="font-bold text-blue-900 mb-2">测试3：观察开关时序</p>
            <p>用双通道示波器同时测量：CH1：VT100A基极驱动信号，CH2：TP211输出电压</p>
            <p className="text-green-700 mt-1">预期：看到6.5V尖峰与VT100A关断时刻同步</p>
          </div>
        </div>
      </div>
    </div>
  );
}
