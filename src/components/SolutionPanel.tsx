"use client";

export default function SolutionPanel() {
  return (
    <div className="space-y-6">
      {/* Solutions */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          解决方案
        </h3>

        <div className="space-y-4">
          {/* Solution 1 */}
          <div className="bg-white rounded-lg p-5 border-l-4 border-green-500 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-bold text-slate-900 text-lg">方案一：增加续流二极管（推荐）</h4>
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                最有效
              </span>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-slate-700 mb-2">位置：继电器负载两端反向并联二极管</p>
                <div className="bg-slate-50 rounded-lg p-4">
                  <svg viewBox="0 0 600 200" className="w-full h-auto">
                    {/* Circuit diagram */}
                    <rect x="50" y="80" width="100" height="40" rx="4" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
                    <text x="100" y="105" textAnchor="middle" className="text-sm font-bold fill-white">PS 5V</text>
                    
                    <line x1="150" y1="100" x2="200" y2="100" stroke="#333" strokeWidth="2"/>
                    
                    <rect x="200" y="70" width="100" height="60" rx="4" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="2"/>
                    <text x="250" y="105" textAnchor="middle" className="text-sm font-bold fill-white">VT100A</text>
                    
                    <line x1="300" y1="100" x2="350" y2="100" stroke="#333" strokeWidth="2"/>
                    
                    <rect x="350" y="70" width="100" height="60" rx="4" fill="#ec4899" stroke="#db2777" strokeWidth="2"/>
                    <text x="400" y="105" textAnchor="middle" className="text-sm font-bold fill-white">继电器</text>
                    
                    <line x1="450" y1="100" x2="500" y2="100" stroke="#333" strokeWidth="2"/>
                    <circle cx="530" cy="100" r="20" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
                    <text x="530" y="105" textAnchor="middle" className="text-xs font-bold fill-white">TP211</text>
                    
                    {/* Flyback diode */}
                    <path d="M 380 130 L 380 160 L 420 160 L 420 130" fill="none" stroke="#10b981" strokeWidth="2"/>
                    <polygon points="400,160 395,170 405,170" fill="#10b981"/>
                    <text x="400" y="185" textAnchor="middle" className="text-xs font-bold fill-green-700">续流二极管</text>
                    <text x="400" y="195" textAnchor="middle" className="text-xs fill-green-600">(BAT54/1N4148)</text>
                  </svg>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-2">推荐型号：</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded p-3">
                    <p className="font-bold text-green-900">BAT54</p>
                    <p className="text-xs text-green-700">肖特基二极管，快速响应</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="font-bold text-green-900">1N4148</p>
                    <p className="text-xs text-green-700">高速开关二极管</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <p className="font-semibold text-green-900 mb-2">原理：</p>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• VT100A关断时，继电器的续流电流通过二极管泄放</li>
                  <li>• 阻止反向电动势叠加到TP211</li>
                  <li>• 从根本上消除尖峰</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Solution 2 */}
          <div className="bg-white rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-bold text-slate-900 text-lg">方案二：增加输出端滤波电容</h4>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                辅助方案
              </span>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-slate-700 mb-2">位置：TP211到地之间</p>
                <div className="bg-slate-50 rounded-lg p-4">
                  <svg viewBox="0 0 400 150" className="w-full h-auto">
                    <line x1="50" y1="50" x2="350" y2="50" stroke="#333" strokeWidth="2"/>
                    <text x="50" y="40" className="text-sm fill-slate-700">TP211</text>
                    
                    <line x1="200" y1="50" x2="200" y2="80" stroke="#333" strokeWidth="2"/>
                    
                    {/* Capacitor */}
                    <line x1="180" y1="80" x2="220" y2="80" stroke="#3b82f6" strokeWidth="3"/>
                    <line x1="180" y1="90" x2="220" y2="90" stroke="#3b82f6" strokeWidth="3"/>
                    
                    <line x1="200" y1="90" x2="200" y2="120" stroke="#333" strokeWidth="2"/>
                    <line x1="170" y1="120" x2="230" y2="120" stroke="#333" strokeWidth="2"/>
                    
                    <text x="200" y="140" textAnchor="middle" className="text-sm font-bold fill-blue-700">
                      C_add (10-100μF)
                    </text>
                  </svg>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-2">建议参数：</p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li><strong>电容值：</strong>10μF - 100μF（陶瓷或电解电容）</li>
                    <li><strong>耐压：</strong>≥ 10V</li>
                    <li><strong>对比：</strong>KL30路径有270μF大电容 → 无尖峰；TP211路径只有100nF → 有尖峰</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Solution 3 */}
          <div className="bg-white rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-bold text-slate-900 text-lg">方案三：调整V101稳压管规格</h4>
              <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
                长期优化
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-2">问题：</p>
                <p className="text-sm text-purple-800">V101的6.2V击穿电压与5V工作电压过于接近，导致在继电器驱动瞬态波动时误触发钳位</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-2">解决方案：</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded p-3 border border-purple-200">
                    <p className="text-xs text-slate-500">原设计</p>
                    <p className="font-bold text-red-600">V101 = 6V2 (6.2V)</p>
                  </div>
                  <div className="bg-white rounded p-3 border border-green-200">
                    <p className="text-xs text-slate-500">建议改为</p>
                    <p className="font-bold text-green-600">V101 = 7V5 或 8V2</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-2">推荐型号：</p>
                <div className="space-y-2">
                  <div className="bg-white rounded p-3 border border-purple-200">
                    <p className="font-bold text-purple-900">BZX84-C7V5</p>
                    <p className="text-xs text-purple-700">7.5V, 250mW, SOD-323封装</p>
                  </div>
                  <div className="bg-white rounded p-3 border border-purple-200">
                    <p className="font-bold text-purple-900">BZX84-C8V2</p>
                    <p className="text-xs text-purple-700">8.2V, 250mW, SOD-323封装</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <p className="font-semibold text-green-900 mb-2">安全裕量计算：</p>
                <p className="text-sm text-green-800">
                  击穿电压 &gt; 工作电压 × 1.3<br/>
                  7.5V &gt; 5V × 1.3 = 6.5V ✓<br/>
                  8.2V &gt; 5V × 1.3 = 6.5V ✓
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Combination */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-200">
        <h3 className="text-xl font-bold text-emerald-900 mb-4">推荐组合方案</h3>
        
        <div className="bg-white rounded-lg p-5 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="bg-emerald-100 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-900">方案A：续流二极管 + 滤波电容（最有效）</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-start">
              <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">1</span>
              <div>
                <p className="font-semibold text-slate-900">在继电器负载两端加肖特基二极管（BAT54）</p>
                <p className="text-sm text-slate-600">根本解决开关瞬态问题</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">2</span>
              <div>
                <p className="font-semibold text-slate-900">在TP211对地加10μF陶瓷电容</p>
                <p className="text-sm text-slate-600">辅助吸收高频噪声</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">3</span>
              <div>
                <p className="font-semibold text-slate-900">验证峰值降至5.5V以下</p>
                <p className="text-sm text-slate-600">使用示波器确认改善效果</p>
              </div>
            </div>
          </div>

          <div className="mt-5 bg-emerald-50 rounded-lg p-4">
            <p className="font-bold text-emerald-900 mb-2">验证标准：</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded p-3 border border-red-200">
                <p className="text-xs text-slate-500">优化前</p>
                <p className="font-bold text-red-600">PS(5V) → TP211峰值 6.5V</p>
              </div>
              <div className="bg-white rounded p-3 border border-green-200">
                <p className="text-xs text-slate-500">优化后</p>
                <p className="font-bold text-green-600">PS(5V) → TP211峰值 ≤ 5.2V</p>
              </div>
            </div>
            <p className="text-sm text-emerald-800 mt-3">改善率：&gt; 90%</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-slate-100 to-slate-200 rounded-lg p-6 border border-slate-300">
        <h3 className="text-xl font-bold text-slate-900 mb-4">总结</h3>
        <div className="space-y-3 text-slate-700">
          <div className="flex items-start">
            <span className="text-red-600 font-bold mr-2">✓</span>
            <p><strong>真正原因：</strong>测量点位置 + VT100A/B开关瞬态</p>
          </div>
          <div className="flex items-start">
            <span className="text-red-600 font-bold mr-2">✓</span>
            <p><strong>关键证据：</strong>K130在输入端测量 → 不经过开关回路 → 无尖峰；PS 5V在输出端TP211测量 → 经过继电器回路 → 有开关瞬态</p>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 font-bold mr-2">✓</span>
            <p><strong>解决方案：</strong>续流二极管（根本解决）+ 大容量滤波电容（辅助吸收）</p>
          </div>
        </div>
      </div>
    </div>
  );
}
