"use client";

import { useEffect, useRef } from "react";

interface VoltageWaveformProps {
  type: "kl30" | "ps5v";
}

export default function VoltageWaveform({ type }: VoltageWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, height - 40);
    ctx.lineTo(width - 20, height - 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(60, height - 40);
    ctx.lineTo(60, 20);
    ctx.stroke();

    // Draw voltage scale
    ctx.fillStyle = "#64748b";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    
    if (type === "kl30") {
      // KL30: 0-16V scale
      for (let v = 0; v <= 16; v += 2) {
        const y = height - 40 - (v / 16) * (height - 80);
        ctx.fillText(`${v}V`, 50, y + 4);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
    } else {
      // PS5V: 0-8V scale
      for (let v = 0; v <= 8; v += 1) {
        const y = height - 40 - (v / 8) * (height - 80);
        ctx.fillText(`${v}V`, 50, y + 4);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
    }

    // Draw time scale
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    for (let t = 0; t <= 10; t += 2) {
      const x = 60 + (t / 10) * (width - 100);
      ctx.fillText(`${t}ms`, x, height - 20);
    }

    // Draw waveform
    ctx.lineWidth = 2.5;
    
    if (type === "kl30") {
      // KL30: Stable 14V with no spike
      ctx.strokeStyle = "#3b82f6";
      ctx.beginPath();
      
      const baseY = height - 40 - (14 / 16) * (height - 80);
      
      // Rising edge
      ctx.moveTo(60, height - 40);
      ctx.lineTo(100, height - 40);
      ctx.lineTo(120, baseY);
      
      // Stable 14V
      for (let x = 120; x < width - 40; x += 1) {
        const noise = Math.sin(x * 0.1) * 2;
        ctx.lineTo(x, baseY + noise);
      }
      
      ctx.stroke();

      // Label
      ctx.fillStyle = "#3b82f6";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("14V (稳定)", width - 150, baseY - 10);
      
      // No spike indicator
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓ 无尖峰", width / 2, 50);
    } else {
      // PS5V: 5V with spike to 6.5V
      ctx.strokeStyle = "#ef4444";
      ctx.beginPath();
      
      const baseY = height - 40 - (5 / 8) * (height - 80);
      const spikeY = height - 40 - (6.5 / 8) * (height - 80);
      
      // Rising edge
      ctx.moveTo(60, height - 40);
      ctx.lineTo(100, height - 40);
      ctx.lineTo(120, baseY);
      
      // Stable 5V until switch event
      for (let x = 120; x < 300; x += 1) {
        const noise = Math.sin(x * 0.1) * 1.5;
        ctx.lineTo(x, baseY + noise);
      }
      
      // Spike at switch event (around x=300)
      ctx.lineTo(300, baseY);
      ctx.lineTo(310, spikeY);  // Spike up
      ctx.lineTo(320, baseY - 10);  // Overshoot down
      ctx.lineTo(330, baseY + 5);   // Recovery
      ctx.lineTo(340, baseY);
      
      // Continue stable
      for (let x = 340; x < width - 40; x += 1) {
        const noise = Math.sin(x * 0.1) * 1.5;
        ctx.lineTo(x, baseY + noise);
      }
      
      ctx.stroke();

      // Labels
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("5V (稳态)", width - 150, baseY - 10);
      
      // Spike annotation
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(310, spikeY);
      ctx.lineTo(310, spikeY - 30);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("6.5V 尖峰!", 310, spikeY - 35);
      
      // Spike indicator
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✗ 有30%尖峰", width / 2, 50);
      
      // Switch event annotation
      ctx.fillStyle = "#8b5cf6";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VT100A关断", 310, height - 50);
      ctx.fillText("产生瞬态", 310, height - 35);
    }

    // Axis labels
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("时间 (ms)", width / 2, height - 5);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("电压 (V)", 0, 0);
    ctx.restore();
  }, [type]);

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full h-auto"
      />
      <div className="mt-4 text-center text-sm text-slate-600">
        {type === "kl30" 
          ? "KL30输入端测量：电压稳定在14V，无开关瞬态"
          : "TP211输出端测量：VT100A关断时产生6.5V尖峰"
        }
      </div>
    </div>
  );
}
