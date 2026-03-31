"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { ArrowDownToLine, Copy, Check, Loader2 } from "lucide-react";
import bs58 from "bs58";

const DENOMINATIONS = [0.1, 1, 10];
const SHIELDED_POOL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_POOL_PROGRAM_ID ||
    "33k7WbNmCBgwQMhH4Y9fQHJpkr7HS3GYKomZHbuBbPso"
);

function generateNoteString(amount: number): {
  noteString: string;
  commitment: Uint8Array;
} {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const nullifierKey = crypto.getRandomValues(new Uint8Array(32));
  const amountLamports = amount * LAMPORTS_PER_SOL;
  const amountBytes = new Uint8Array(8);
  new DataView(amountBytes.buffer).setBigUint64(0, BigInt(amountLamports), true);
  const leafIndex = new Uint8Array(4);

  const noteBytes = new Uint8Array(76);
  noteBytes.set(secret, 0);
  noteBytes.set(nullifierKey, 32);
  noteBytes.set(amountBytes, 64);
  noteBytes.set(leafIndex, 72);

  const noteString = "shield-sol-" + bs58.encode(noteBytes);

  // For demo, commitment is hash of secret + nullifier (simplified)
  const commitment = secret.slice(0, 32);

  return { noteString, commitment };
}

interface DepositPanelProps {
  onDeposit?: () => void;
}

export default function DepositPanel({ onDeposit }: DepositPanelProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [selectedAmount, setSelectedAmount] = useState<number>(1);
  const [isDepositing, setIsDepositing] = useState(false);
  const [noteString, setNoteString] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!publicKey || !sendTransaction) {
      setError("Please connect your wallet first");
      return;
    }

    setIsDepositing(true);
    setError(null);
    setNoteString(null);
    setTxHash(null);

    try {
      const { noteString: note } = generateNoteString(selectedAmount);

      // For the demo, we just transfer SOL to the vault PDA
      // In production, this would call the shielded pool program's deposit instruction
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        SHIELDED_POOL_PROGRAM_ID
      );

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: vaultPda,
          lamports: selectedAmount * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setNoteString(note);
      setTxHash(signature);
      onDeposit?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Deposit failed. Please try again."
      );
    } finally {
      setIsDepositing(false);
    }
  };

  const copyNote = () => {
    if (noteString) {
      navigator.clipboard.writeText(noteString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border border-[hsl(220,15%,14%)] rounded-lg bg-[hsl(220,18%,6%)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[hsl(220,15%,14%)] flex items-center gap-2">
        <ArrowDownToLine className="w-4 h-4 text-[#00ed89]" />
        <span className="text-sm font-medium text-white/90">Deposit</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Amount selection */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2 block">
            Select Amount
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DENOMINATIONS.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                className={`py-3 px-4 rounded-lg border text-center font-mono text-sm transition-all ${
                  selectedAmount === amount
                    ? "border-[#00ed89]/50 bg-[#00ed89]/10 text-[#00ed89]"
                    : "border-[hsl(220,15%,14%)] bg-transparent text-white/50 hover:border-white/20 hover:text-white/70"
                }`}
              >
                {amount} SOL
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-[hsl(220,18%,4%)] rounded-lg p-3 border border-[hsl(220,15%,12%)]">
          <p className="text-[11px] text-white/30 leading-relaxed">
            Depositing {selectedAmount} SOL into the privacy pool. You will
            receive a <span className="text-[#00ed89]/70">note string</span>{" "}
            that you must save to withdraw later. Anyone with this string can
            withdraw the funds to any wallet.
          </p>
        </div>

        {/* Deposit button */}
        <button
          onClick={handleDeposit}
          disabled={!publicKey || isDepositing}
          className="w-full py-3 px-4 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#00ed89]/10 border border-[#00ed89]/30 text-[#00ed89] hover:bg-[#00ed89]/20 hover:border-[#00ed89]/50 animate-pulse-glow"
        >
          {isDepositing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Depositing...
            </span>
          ) : !publicKey ? (
            "Connect Wallet to Deposit"
          ) : (
            `Deposit ${selectedAmount} SOL`
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Note string output */}
        {noteString && (
          <div className="border border-[#00ed89]/30 rounded-lg bg-[#00ed89]/5 overflow-hidden">
            <div className="px-3 py-2 border-b border-[#00ed89]/20 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#00ed89]/70 font-medium">
                Your Note String (Save This!)
              </span>
              <button
                onClick={copyNote}
                className="text-[#00ed89]/70 hover:text-[#00ed89] transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="p-3">
              <p className="font-mono text-xs text-[#00ed89] break-all leading-relaxed select-all">
                {noteString}
              </p>
            </div>
            {txHash && (
              <div className="px-3 pb-3">
                <a
                  href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-white/30 hover:text-[#00ed89] transition-colors"
                >
                  View TX on Explorer &rarr;
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
