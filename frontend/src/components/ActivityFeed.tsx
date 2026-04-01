"use client";

import { ArrowDownToLine, ArrowUpFromLine, Shield } from "lucide-react";

interface Activity {
  type: "deposit" | "withdraw";
  amount: number;
  time: string;
  txHash?: string;
}

const recentActivity: Activity[] = [
  { type: "deposit", amount: 1, time: "2 min ago", txHash: "4ag1uUTv..." },
  { type: "withdraw", amount: 1, time: "5 min ago", txHash: "2n7tTjPe..." },
  { type: "deposit", amount: 10, time: "12 min ago" },
  { type: "deposit", amount: 0.1, time: "18 min ago" },
  { type: "withdraw", amount: 10, time: "25 min ago" },
];

export default function ActivityFeed() {
  return (
    <div className="border border-[hsl(220,15%,14%)] rounded-lg bg-[hsl(220,18%,6%)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[hsl(220,15%,14%)] flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
          Recent Activity
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ed89] animate-pulse" />
          <span className="text-[10px] text-white/30">Live</span>
        </div>
      </div>
      <div className="divide-y divide-[hsl(220,15%,10%)]">
        {recentActivity.map((item, i) => (
          <div
            key={i}
            className="px-3 py-2.5 hover:bg-white/[0.02] transition-colors flex items-center gap-3"
          >
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                item.type === "deposit"
                  ? "bg-[#00ed89]/10"
                  : "bg-white/5"
              }`}
            >
              {item.type === "deposit" ? (
                <ArrowDownToLine className="w-3 h-3 text-[#00ed89]" />
              ) : (
                <ArrowUpFromLine className="w-3 h-3 text-white/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/70 capitalize">
                  {item.type}
                </span>
                <Shield className="w-2.5 h-2.5 text-white/20" />
              </div>
              <span className="text-[10px] font-mono text-white/25">
                {item.time}
              </span>
            </div>
            <span
              className={`font-mono text-xs ${
                item.type === "deposit"
                  ? "text-[#00ed89]"
                  : "text-white/50"
              }`}
            >
              {item.type === "deposit" ? "+" : "-"}
              {item.amount} SOL
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
