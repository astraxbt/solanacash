"use client";

import { useState } from "react";
import { ArrowUpFromLine, Loader2, ExternalLink } from "lucide-react";

export default function WithdrawPanel() {
  const [noteString, setNoteString] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!noteString.trim()) {
      setError("Please paste your note string");
      return;
    }
    if (!recipientAddress.trim()) {
      setError("Please enter the recipient wallet address");
      return;
    }
    if (!noteString.startsWith("shield-sol-")) {
      setError("Invalid note string format");
      return;
    }

    setIsWithdrawing(true);
    setError(null);
    setTxHash(null);

    try {
      // In production, this would:
      // 1. Parse the note string to extract secret + nullifierKey
      // 2. Fetch the Merkle tree state from on-chain
      // 3. Generate a ZK proof using sunspot prove
      // 4. Submit the withdrawal TX through a relayer
      // For the demo frontend, we show the flow
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setError(
        "Withdrawal requires ZK proof generation (CLI only for now). " +
          "Use the test client: pnpm run test-shielded-pool"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Withdrawal failed. Please try again."
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="border border-[hsl(220,15%,14%)] rounded-lg bg-[hsl(220,18%,6%)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[hsl(220,15%,14%)] flex items-center gap-2">
        <ArrowUpFromLine className="w-4 h-4 text-[#00ed89]" />
        <span className="text-sm font-medium text-white/90">Withdraw</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Note string input */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2 block">
            Note String
          </label>
          <textarea
            value={noteString}
            onChange={(e) => setNoteString(e.target.value)}
            placeholder="shield-sol-..."
            rows={3}
            className="w-full bg-[hsl(220,18%,4%)] border border-[hsl(220,15%,14%)] rounded-lg px-3 py-2.5 text-xs font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#00ed89]/40 transition-colors resize-none"
          />
        </div>

        {/* Recipient address */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2 block">
            Recipient Wallet Address
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter any Solana wallet address"
            className="w-full bg-[hsl(220,18%,4%)] border border-[hsl(220,15%,14%)] rounded-lg px-3 py-2.5 text-xs font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#00ed89]/40 transition-colors"
          />
        </div>

        {/* Info box */}
        <div className="bg-[hsl(220,18%,4%)] rounded-lg p-3 border border-[hsl(220,15%,12%)]">
          <p className="text-[11px] text-white/30 leading-relaxed">
            Withdraw to{" "}
            <span className="text-white/50">any wallet address</span>. The ZK
            proof cryptographically ensures that the withdrawal cannot be linked
            to any specific deposit. A{" "}
            <span className="text-[#00ed89]/70">relayer</span> submits the
            transaction so the recipient wallet needs no prior SOL balance.
          </p>
        </div>

        {/* Withdraw button */}
        <button
          onClick={handleWithdraw}
          disabled={isWithdrawing || !noteString.trim()}
          className="w-full py-3 px-4 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
        >
          {isWithdrawing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating ZK Proof...
            </span>
          ) : (
            "Withdraw"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-400">{error}</p>
          </div>
        )}

        {/* TX result */}
        {txHash && (
          <div className="border border-[#00ed89]/30 rounded-lg bg-[#00ed89]/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#00ed89]">
                Withdrawal successful!
              </span>
              <a
                href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-[#00ed89] transition-colors"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
