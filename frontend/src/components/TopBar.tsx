"use client";

import { Shield } from "lucide-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function TopBar() {
  return (
    <div className="w-full h-12 border-b border-[hsl(220,15%,14%)] bg-[hsl(220,18%,5%)]/90 backdrop-blur-sm flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#00ed89]" />
          <span className="text-white/90 text-sm font-semibold tracking-tight">
            SolanaCash
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/40">Privacy Mixer</span>
          <span className="font-mono text-[#00ed89] font-medium">Devnet</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://github.com/astraxbt/solanacash"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-[11px] font-medium text-white/70 border border-[hsl(220,15%,14%)] rounded hover:border-[rgba(0,237,137,0.4)] hover:text-[#00ed89] transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
        <WalletMultiButton />
      </div>
    </div>
  );
}
