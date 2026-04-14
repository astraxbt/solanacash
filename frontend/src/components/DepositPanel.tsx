"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { ArrowDownToLine, Copy, Check, Loader2 } from "lucide-react";
import { initPoseidon, poseidonHash3 } from "@/lib/poseidon";
import { ShieldedPoolMerkleTree } from "@/lib/merkle";
import {
  generateNoteString,
  randomField,
  type NoteData,
} from "@/lib/note";

const DENOMINATIONS = [0.1, 1, 10];
const SHIELDED_POOL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_POOL_PROGRAM_ID ||
    "33k7WbNmCBgwQMhH4Y9fQHJpkr7HS3GYKomZHbuBbPso"
);

/** Encode a bigint as 32-byte big-endian Uint8Array. */
function fieldToBytes(f: bigint): Uint8Array {
  const hex = f.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Encode a u64 as 8-byte little-endian Uint8Array. */
function u64ToLeBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

/**
 * Load the local Merkle tree state from localStorage. Each deposit's
 * commitment is stored so we can compute the correct root for the next
 * deposit. In production this would come from an indexer service.
 */
function loadTreeState(): bigint[] {
  try {
    const raw = localStorage.getItem("shield_tree_commitments");
    if (!raw) return [];
    return JSON.parse(raw).map((hex: string) => BigInt(hex));
  } catch {
    return [];
  }
}

function saveTreeState(commitments: bigint[]): void {
  const serialized = commitments.map((c: bigint) => "0x" + c.toString(16));
  localStorage.setItem("shield_tree_commitments", JSON.stringify(serialized));
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
  const [poseidonReady, setPoseidonReady] = useState(false);

  useEffect(() => {
    initPoseidon().then(() => setPoseidonReady(true));
  }, []);

  const handleDeposit = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      setError("Please connect your wallet first");
      return;
    }
    if (!poseidonReady) {
      setError("Cryptographic library loading, please wait...");
      return;
    }

    setIsDepositing(true);
    setError(null);
    setNoteString(null);
    setTxHash(null);

    try {
      const amountLamports = BigInt(Math.round(selectedAmount * LAMPORTS_PER_SOL));

      // Generate random secrets
      const secret = randomField();
      const nullifierKey = randomField();

      // Compute Poseidon commitment = H(secret, nullifierKey, amount)
      const commitment = poseidonHash3(secret, nullifierKey, amountLamports);

      // Build local Merkle tree, insert commitment, compute new root
      const existingCommitments = loadTreeState();
      const mt = new ShieldedPoolMerkleTree();
      for (const c of existingCommitments) {
        mt.insert(c);
      }
      const leafIndex = mt.insert(commitment);
      const root = mt.getRoot();

      // Build deposit instruction data:
      //   [DEPOSIT=1, amount(8 bytes LE), commitment(32 bytes BE), new_root(32 bytes BE)]
      const data = new Uint8Array(1 + 8 + 32 + 32);
      data[0] = 1; // DEPOSIT instruction
      data.set(u64ToLeBytes(amountLamports), 1);
      data.set(fieldToBytes(commitment), 1 + 8);
      data.set(fieldToBytes(root), 1 + 8 + 32);

      // Derive PDAs
      const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_state")],
        SHIELDED_POOL_PROGRAM_ID
      );
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        SHIELDED_POOL_PROGRAM_ID
      );

      // Accounts: [payer (signer+writable), state (writable), vault (writable), system_program]
      const depositIx = new TransactionInstruction({
        programId: SHIELDED_POOL_PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: statePda, isSigner: false, isWritable: true },
          { pubkey: vaultPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(data),
      });

      const transaction = new Transaction().add(depositIx);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      // Save updated tree state
      existingCommitments.push(commitment);
      saveTreeState(existingCommitments);

      // Generate note string for the user to save
      const noteData: NoteData = {
        secret,
        nullifierKey,
        amount: amountLamports,
        leafIndex,
      };
      const note = generateNoteString(noteData);

      setNoteString(note);
      setTxHash(signature);
      onDeposit?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Deposit failed. Please try again.";
      if (message.includes("UninitializedAccount") || message.includes("uninitialized")) {
        setError(
          "Pool not initialized. An admin must run the Initialize instruction first."
        );
      } else {
        setError(message);
      }
    } finally {
      setIsDepositing(false);
    }
  }, [publicKey, sendTransaction, connection, selectedAmount, poseidonReady, onDeposit]);

  const copyNote = () => {
    if (noteString) {
      navigator.clipboard.writeText(noteString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cluster =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
      ? ""
      : "?cluster=devnet";

  return (
    <div className="border border-[hsl(220,15%,14%)] rounded-lg bg-[hsl(220,18%,6%)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[hsl(220,15%,14%)] flex items-center gap-2">
        <ArrowDownToLine className="w-4 h-4 text-[#00ed89]" />
        <span className="text-sm font-medium text-white/90">Deposit</span>
        {!poseidonReady && (
          <span className="text-[10px] text-white/30 ml-auto">
            Loading crypto...
          </span>
        )}
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
          disabled={!publicKey || isDepositing || !poseidonReady}
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
            <div className="px-3 pb-3 space-y-1">
              <p className="text-[10px] text-amber-400/80">
                Save this note string securely. It is the ONLY way to withdraw
                your funds. If you lose it, your deposit is unrecoverable.
              </p>
              {txHash && (
                <a
                  href={`https://explorer.solana.com/tx/${txHash}${cluster}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-white/30 hover:text-[#00ed89] transition-colors inline-block"
                >
                  View TX on Explorer &rarr;
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
