"use client";

import { Shield, Hash, Eye, Users } from "lucide-react";

interface PoolStatsProps {
  poolBalance: number | null;
  totalDeposits: number | null;
  anonymitySet: number | null;
}

export default function PoolStats({
  poolBalance,
  totalDeposits,
  anonymitySet,
}: PoolStatsProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Protocol Overview */}
      <div className="border border-[hsl(220,15%,14%)] rounded-lg bg-[hsl(220,18%,6%)] overflow-hidden">
        <div className="px-3 py-2 border-b border-[hsl(220,15%,14%)]">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
            Protocol Overview
          </span>
        </div>
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Network</span>
            <span className="font-mono text-xs font-semibold text-[#00ed89]">
              Solana Devnet
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Protocol</span>
            <span className="font-mono text-xs text-white/70">
              Groth16 + Poseidon
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Status</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ed89] animate-pulse" />
              <span className="font-mono text-xs text-[#00ed89]">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pool Stats */}
      <div className="border border-[rgba(0,237,137,0.2)] rounded-lg bg-[hsl(220,18%,6%)] overflow-hidden">
        <div className="px-3 py-2 border-b border-[hsl(220,15%,14%)] flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
            Pool Statistics
          </span>
          <Shield className="w-3 h-3 text-[#00ed89]" />
        </div>
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Pool Balance</span>
            <span className="font-mono text-lg font-bold text-[#00ed89]">
              {poolBalance !== null
                ? `${(poolBalance / 1e9).toFixed(2)} SOL`
                : "---"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Total Deposits</span>
            <span className="font-mono text-sm text-white/70">
              {totalDeposits !== null ? totalDeposits : "---"}
            </span>
          </div>
          <div className="w-full bg-[hsl(220,15%,14%)] rounded-full h-1.5">
            <div
              className="bg-[#00ed89] h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((totalDeposits ?? 0) * 2, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="border border-[hsl(220,15%,14%)] rounded-lg bg-[hsl(220,18%,6%)] overflow-hidden">
        <div className="px-3 py-2 border-b border-[hsl(220,15%,14%)]">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
            Privacy Guarantees
          </span>
        </div>
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.02] transition-colors">
            <span className="flex items-center gap-2 text-xs text-white/70">
              <Eye className="w-3.5 h-3.5 text-white/30" />
              Anonymity Set
            </span>
            <span className="font-mono text-xs text-white/50">
              {anonymitySet !== null ? anonymitySet : "---"}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.02] transition-colors">
            <span className="flex items-center gap-2 text-xs text-white/70">
              <Hash className="w-3.5 h-3.5 text-white/30" />
              Merkle Depth
            </span>
            <span className="font-mono text-xs text-white/50">16</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.02] transition-colors">
            <span className="flex items-center gap-2 text-xs text-white/70">
              <Users className="w-3.5 h-3.5 text-white/30" />
              ZK Proof
            </span>
            <span className="font-mono text-xs text-white/50">Groth16</span>
          </div>
        </div>
      </div>
    </div>
  );
}
