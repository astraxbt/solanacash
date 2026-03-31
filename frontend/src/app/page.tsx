"use client";

import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import PoolStats from "@/components/PoolStats";
import DepositPanel from "@/components/DepositPanel";
import WithdrawPanel from "@/components/WithdrawPanel";
import HowItWorks from "@/components/HowItWorks";
import ActivityFeed from "@/components/ActivityFeed";
import BottomBar from "@/components/BottomBar";
import { useState } from "react";

const WalletProvider = dynamic(
  () => import("@/components/WalletProvider"),
  { ssr: false }
);

export default function Home() {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  return (
    <WalletProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <TopBar />

        <div className="flex-1 flex overflow-hidden">
          {/* Left Rail - Stats */}
          <div className="w-60 flex-shrink-0 p-3 overflow-y-auto border-r border-[hsl(220,15%,14%)] hidden lg:block">
            <PoolStats
              poolBalance={12500000000}
              totalDeposits={24}
              anonymitySet={24}
            />
          </div>

          {/* Center Panel */}
          <div className="flex-1 flex flex-col min-w-0 p-3 gap-3 overflow-y-auto">
            {/* Hero */}
            <div className="text-center py-6">
              <h1 className="text-2xl font-semibold text-white/90 tracking-tight mb-2">
                Privacy on Solana
              </h1>
              <p className="text-sm text-white/40 max-w-md mx-auto">
                Break the on-chain link between your deposit and withdrawal
                using zero-knowledge proofs. No one can trace your funds.
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-[hsl(220,18%,6%)] border border-[hsl(220,15%,14%)] rounded-lg w-fit mx-auto">
              <button
                onClick={() => setActiveTab("deposit")}
                className={`px-6 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "deposit"
                    ? "bg-[#00ed89]/10 text-[#00ed89] border border-[#00ed89]/30"
                    : "text-white/40 hover:text-white/60 border border-transparent"
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`px-6 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "withdraw"
                    ? "bg-white/5 text-white/80 border border-white/10"
                    : "text-white/40 hover:text-white/60 border border-transparent"
                }`}
              >
                Withdraw
              </button>
            </div>

            {/* Active panel */}
            <div className="max-w-lg mx-auto w-full">
              {activeTab === "deposit" ? <DepositPanel /> : <WithdrawPanel />}
            </div>

            {/* How it works */}
            <HowItWorks />
          </div>

          {/* Right Rail - Activity */}
          <div className="w-64 flex-shrink-0 p-3 overflow-y-auto border-l border-[hsl(220,15%,14%)] hidden xl:block">
            <ActivityFeed />
          </div>
        </div>

        <BottomBar />
      </div>
    </WalletProvider>
  );
}
