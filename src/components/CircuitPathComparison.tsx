"use client";

interface CircuitPathComparisonProps {
  path: "kl30" | "ps5v";
}

export default function CircuitPathComparison({ path }: CircuitPathComparisonProps) {
  if (path === "kl30") {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg p-6">
        <svg viewBox="0 0 800 300" className="w-full h-auto">
          {/* Background Grid */}
          <defs>
            <pattern id="grid-kl30" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="800" height="300" fill="url(#grid-kl30)" />

          {/* Title */}
          <text x="400" y="30" textAnchor="middle" className="text-lg font-bold fill-slate-700">
            KL30电路路径（14V输入，无尖峰）
          </text>

          {/* Power Source */}
          <rect x="50" y="120" width="100" height="60" rx="8" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
          <text x="100" y="145" textAnchor="middle" className="text-sm font-bold fill-white">PS</text>
          <text x="100" y="165" textAnchor="middle" className="text-xs fill-blue-100">14V</text>

          {/* Arrow 1 */}
          <line x1="150" y1="150" x2="200" y2="150" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowBlue)"/>
          <text x="175" y="140" textAnchor="middle" className="text-xs fill-slate-600">KL30</text>

          {/* VT100A/B */}
          <rect x="200" y="110" width="120" height="80" rx="8" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="2"/>
          <text x="260" y="140" textAnchor="middle" className="text-sm font-bold fill-white">VT100A/B</text>
          <text x="260" y="160" textAnchor="middle" className="text-xs fill-purple-100">PUMD2</text>
          <text x="260" y="175" textAnchor="middle" className="text-xs fill-purple-100">双NPN</text>

          {/* Arrow 2 */}
          <line x1="320" y1="150" x2="370" y2="150" stroke="#8b5cf6" strokeWidth="3" markerEnd="url(#arrowPurple)"/>

          {/* VT101 MOSFET */}
          <rect x="370" y="110" width="120" height="80" rx="8" fill="#10b981" stroke="#059669" strokeWidth="2"/>
          <text x="430" y="140" textAnchor="middle" className="text-sm font-bold fill-white">VT101</text>
          <text x="430" y="160" textAnchor="middle" className="text-xs fill-green-100">MOSFET</text>
          <text x="430" y="175" textAnchor="middle" className="text-xs fill-green-100">IPC100N04S5</text>

          {/* Arrow 3 */}
          <line x1="490" y1="150" x2="540" y2="150" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowGreen)"/>

          {/* VS100 TVS */}
          <rect x="540" y="110" width="120" height="80" rx="8" fill="#f59e0b" stroke="#d97706" strokeWidth="2"/>
          <text x="600" y="140" textAnchor="middle" className="text-sm font-bold fill-white">VS100</text>
          <text x="600" y="160" textAnchor="middle" className="text-xs fill-amber-100">SMAJ33CA</text>
          <text x="600" y="175" textAnchor="middle" className="text-xs fill-amber-100">33V TVS</text>

          {/* Arrow 4 */}
          <line x1="660" y1="150" x2="710" y2="150" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrowAmber)"/>

          {/* Output */}
          <circle cx="740" cy="150" r="30" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
          <text x="740" y="145" textAnchor="middle" className="text-xs font-bold fill-white">输出</text>
          <text x="740" y="160" textAnchor="middle" className="text-xs fill-blue-100">14V</text>

          {/* Measurement Point */}
          <g>
            <circle cx="100" cy="220" r="25" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
            <text x="100" y="215" textAnchor="middle" className="text-xs font-bold fill-white">测量点</text>
            <text x="100" y="230" textAnchor="middle" className="text-xs fill-red-100">输入端</text>
          </g>

          {/* Key Info */}
          <g>
            <rect x="250" y="220" width="300" height="60" rx="8" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
            <text x="400" y="245" textAnchor="middle" className="text-sm font-bold fill-green-800">
              ✓ VS100(33V)远高于14V，不钳位
            </text>
            <text x="400" y="265" textAnchor="middle" className="text-xs fill-green-700">
              测量点在输入端，不经过开关回路
            </text>
          </g>

          {/* Arrow Markers */}
          <defs>
            <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
            </marker>
            <marker id="arrowPurple" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#8b5cf6" />
            </marker>
            <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
            </marker>
            <marker id="arrowAmber" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
            </marker>
          </defs>
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-slate-50 rounded-lg p-6">
      <svg viewBox="0 0 800 300" className="w-full h-auto">
        {/* Background Grid */}
        <defs>
          <pattern id="grid-ps5v" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="800" height="300" fill="url(#grid-ps5v)" />

        {/* Title */}
        <text x="400" y="30" textAnchor="middle" className="text-lg font-bold fill-slate-700">
          PS 5V电路路径（输出端TP211，有尖峰）
        </text>

        {/* Power Source */}
        <rect x="50" y="120" width="100" height="60" rx="8" fill="#3b82f6" stroke="#1e40af" strokeWidth="2"/>
        <text x="100" y="145" textAnchor="middle" className="text-sm font-bold fill-white">PS</text>
        <text x="100" y="165" textAnchor="middle" className="text-xs fill-blue-100">5V</text>

        {/* Arrow 1 */}
        <line x1="150" y1="150" x2="200" y2="150" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowBlue2)"/>
        <text x="175" y="140" textAnchor="middle" className="text-xs fill-slate-600">5V输入</text>

        {/* VT100A/B */}
        <rect x="200" y="110" width="120" height="80" rx="8" fill="#8b5cf6" stroke="#6d28d9" strokeWidth="2"/>
        <text x="260" y="140" textAnchor="middle" className="text-sm font-bold fill-white">VT100A/B</text>
        <text x="260" y="160" textAnchor="middle" className="text-xs fill-purple-100">PUMD2</text>
        <text x="260" y="175" textAnchor="middle" className="text-xs fill-purple-100">开关驱动</text>

        {/* Arrow 2 - Highlighted as problem area */}
        <line x1="320" y1="150" x2="370" y2="150" stroke="#ef4444" strokeWidth="4" strokeDasharray="5,5" markerEnd="url(#arrowRed)"/>
        <text x="345" y="135" textAnchor="middle" className="text-xs font-bold fill-red-600">开关瞬态</text>

        {/* Relay Circuit */}
        <rect x="370" y="110" width="120" height="80" rx="8" fill="#ec4899" stroke="#db2777" strokeWidth="2"/>
        <text x="430" y="140" textAnchor="middle" className="text-sm font-bold fill-white">继电器</text>
        <text x="430" y="160" textAnchor="middle" className="text-xs fill-pink-100">回路</text>
        <text x="430" y="175" textAnchor="middle" className="text-xs fill-pink-100">感性负载</text>

        {/* Arrow 3 */}
        <line x1="490" y1="150" x2="540" y2="150" stroke="#ec4899" strokeWidth="3" markerEnd="url(#arrowPink)"/>

        {/* V101 Zener */}
        <rect x="540" y="110" width="120" height="80" rx="8" fill="#f97316" stroke="#ea580c" strokeWidth="2"/>
        <text x="600" y="140" textAnchor="middle" className="text-sm font-bold fill-white">V101</text>
        <text x="600" y="160" textAnchor="middle" className="text-xs fill-orange-100">6V2</text>
        <text x="600" y="175" textAnchor="middle" className="text-xs fill-orange-100">6.2V稳压</text>

        {/* Arrow 4 */}
        <line x1="660" y1="150" x2="710" y2="150" stroke="#f97316" strokeWidth="3" markerEnd="url(#arrowOrange)"/>

        {/* Output TP211 */}
        <circle cx="740" cy="150" r="30" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
        <text x="740" y="145" textAnchor="middle" className="text-xs font-bold fill-white">TP211</text>
        <text x="740" y="160" textAnchor="middle" className="text-xs fill-red-100">6.5V!</text>

        {/* Measurement Point */}
        <g>
          <circle cx="740" cy="220" r="25" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
          <text x="740" y="215" textAnchor="middle" className="text-xs font-bold fill-white">测量点</text>
          <text x="740" y="230" textAnchor="middle" className="text-xs fill-red-100">输出端</text>
        </g>

        {/* Key Info */}
        <g>
          <rect x="200" y="220" width="350" height="60" rx="8" fill="#fee2e2" stroke="#dc2626" strokeWidth="2"/>
          <text x="375" y="245" textAnchor="middle" className="text-sm font-bold fill-red-800">
            ✗ VT100A/B开关产生瞬态电压
          </text>
          <text x="375" y="265" textAnchor="middle" className="text-xs fill-red-700">
            测量点在输出端TP211，经过完整开关回路
          </text>
        </g>

        {/* Arrow Markers */}
        <defs>
          <marker id="arrowBlue2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
          </marker>
          <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
          <marker id="arrowPink" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#ec4899" />
          </marker>
          <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#f97316" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
