"use client";

import { Shield, Lock, Zap } from "lucide-react";

export default function BottomBar() {
  return (
    <div className="w-full border-t border-[hsl(220,15%,14%)] bg-[hsl(220,18%,5%)]/90 backdrop-blur-sm px-4 py-2 flex items-center justify-between text-[10px] text-white/25">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Zero-Knowledge Privacy
        </span>
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Non-Custodial
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Powered by Noir + Groth16
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span>Built on Solana</span>
        <span className="text-white/15">|</span>
        <a
          href="https://github.com/astraxbt/solanacash"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#00ed89] transition-colors"
        >
          Open Source
        </a>
      </div>
    </div>
  );
}
