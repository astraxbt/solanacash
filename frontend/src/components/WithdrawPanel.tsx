"use client";

import { useState, useEffect } from "react";
import {
  ArrowUpFromLine,
  Loader2,
  ExternalLink,
  Shield,
  Terminal,
} from "lucide-react";
import { initPoseidon } from "@/lib/poseidon";
import { parseNoteString, type NoteData } from "@/lib/note";

const LAMPORTS_PER_SOL = 1_000_000_000;

export default function WithdrawPanel() {
  const [noteString, setNoteString] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedNote, setParsedNote] = useState<NoteData | null>(null);
  const [poseidonReady, setPoseidonReady] = useState(false);

  useEffect(() => {
    initPoseidon().then(() => setPoseidonReady(true));
  }, []);

  // Parse note string as the user types
  useEffect(() => {
    if (!noteString.trim() || !noteString.startsWith("shield-sol-")) {
      setParsedNote(null);
      return;
    }
    try {
      const parsed = parseNoteString(noteString.trim());
      setParsedNote(parsed);
    } catch {
      setParsedNote(null);
    }
  }, [noteString]);

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
    if (!parsedNote) {
      setError("Could not parse note string");
      return;
    }

    setIsWithdrawing(true);
    setError(null);
    setTxHash(null);

    try {
      const relayerUrl =
        process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3001";

      const resp = await fetch(`${relayerUrl}/api/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteString: noteString.trim(),
          recipientAddress: recipientAddress.trim(),
        }),
      });

      const result = await resp.json();

      if (!resp.ok) {
        throw new Error(result.error || `Relayer error (${resp.status})`);
      }

      setTxHash(result.txHash);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError(
          "Could not reach relayer service. Make sure the relayer is running:\n" +
            "cd relayer && npm run dev"
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Withdrawal failed. Please try again."
        );
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  const cluster =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
      ? ""
      : "?cluster=devnet";

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

        {/* Decoded note info */}
        {parsedNote && (
          <div className="bg-[#00ed89]/5 border border-[#00ed89]/20 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5 text-[#00ed89]/70" />
              <span className="text-[10px] uppercase tracking-wider text-[#00ed89]/70 font-medium">
                Note Decoded
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-white/30">Amount</span>
              <span className="text-[11px] font-mono text-[#00ed89]">
                {(Number(parsedNote.amount) / LAMPORTS_PER_SOL).toFixed(
                  parsedNote.amount % BigInt(LAMPORTS_PER_SOL) === 0n
                    ? 0
                    : 3
                )}{" "}
                SOL
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-white/30">Leaf Index</span>
              <span className="text-[11px] font-mono text-white/60">
                #{parsedNote.leafIndex}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] text-white/30">Nullifier Key</span>
              <span className="text-[11px] font-mono text-white/40 truncate ml-4 max-w-[180px]">
                0x{parsedNote.nullifierKey.toString(16).slice(0, 16)}...
              </span>
            </div>
          </div>
        )}

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

        {/* Relayer info box */}
        <div className="bg-[hsl(220,18%,4%)] rounded-lg p-3 border border-[hsl(220,15%,12%)] space-y-2">
          <p className="text-[11px] text-white/30 leading-relaxed">
            Withdraw to{" "}
            <span className="text-white/50">any wallet address</span>. The ZK
            proof cryptographically binds the recipient address and amount to
            the proof, preventing front-running attacks.
          </p>
          <p className="text-[11px] text-white/30 leading-relaxed">
            A <span className="text-[#00ed89]/70">relayer</span> submits the
            transaction and pays gas fees, so the recipient wallet needs{" "}
            <span className="text-white/50">no prior SOL balance</span>.
          </p>
        </div>

        {/* Withdrawal flow explanation */}
        <div className="bg-[hsl(220,18%,4%)] rounded-lg p-3 border border-[hsl(220,15%,12%)]">
          <div className="flex items-center gap-1.5 mb-2">
            <Terminal className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
              Withdrawal Flow
            </span>
          </div>
          <ol className="space-y-1 text-[11px] text-white/25 leading-relaxed list-decimal list-inside">
            <li>
              Note string is parsed to extract{" "}
              <span className="text-white/40">secret + nullifier</span>
            </li>
            <li>
              Merkle proof is computed from on-chain tree state
            </li>
            <li>
              <span className="text-[#00ed89]/50">ZK proof</span> is generated
              (binds recipient + amount)
            </li>
            <li>
              <span className="text-[#00ed89]/50">Relayer</span> submits TX:{" "}
              <span className="text-white/40 font-mono text-[10px]">
                [relayer, recipient, vault, state, nullifier, verifier, system]
              </span>
            </li>
            <li>
              On-chain program verifies proof, consumes nullifier, releases SOL
            </li>
          </ol>
        </div>

        {/* Withdraw button */}
        <button
          onClick={handleWithdraw}
          disabled={
            isWithdrawing ||
            !noteString.trim() ||
            !recipientAddress.trim() ||
            !poseidonReady
          }
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

        {/* Error / Info */}
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-400 whitespace-pre-line">{error}</p>
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
                href={`https://explorer.solana.com/tx/${txHash}${cluster}`}
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
