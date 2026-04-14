import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import {
  address,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  appendTransactionMessageInstructions,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  addSignersToTransactionMessage,
  assertIsSendableTransaction,
  assertIsTransactionWithBlockhashLifetime,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
  getProgramDerivedAddress,
  getAddressEncoder,
  type Address,
  type KeyPairSigner,
} from "@solana/kit";
import { getSetComputeUnitLimitInstruction } from "@solana-program/compute-budget";
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system";

import {
  initPoseidon,
  poseidonHash2,
  poseidonHash3,
  ShieldedPoolMerkleTree,
} from "./merkle.js";
import { parseNoteString } from "./note.js";
import { generateProof, type CircuitConfig } from "./proof.js";

// ---------------------------------------------------------------------------
// Configuration (from environment)
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || "3001", 10);
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const SHIELDED_POOL_PROGRAM_ID = address(
  process.env.SHIELDED_POOL_PROGRAM_ID || "33k7WbNmCBgwQMhH4Y9fQHJpkr7HS3GYKomZHbuBbPso"
);
const ZK_VERIFIER_PROGRAM_ID = address(
  process.env.ZK_VERIFIER_PROGRAM_ID || "GzJDDpR3MxDmSq36EZLZ6amET9dJx5SMfb9dUTfp5cEB"
);

const repoRoot = path.resolve(process.cwd(), "..");
const circuitConfig: CircuitConfig = {
  circuitDir: path.join(repoRoot, "noir_circuit"),
  circuitName: "shielded_pool_verifier",
};

// Relayer wallet path — override with RELAYER_WALLET_PATH env var
const relayerWalletPath =
  process.env.RELAYER_WALLET_PATH ||
  path.join(repoRoot, "keypair", "relayer.json");

// Persistent tree state file
const TREE_STATE_PATH =
  process.env.TREE_STATE_PATH || path.join(repoRoot, "relayer", "tree-state.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fieldToHex(f: bigint): string {
  return "0x" + f.toString(16).padStart(64, "0");
}

function fieldToBytes(f: bigint): Uint8Array {
  const hex = f.toString(16).padStart(64, "0");
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

function u64ToLeBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

function recipientFieldFromPubkey(pubkey: Address): string {
  const pubkeyBytes = getAddressEncoder().encode(pubkey);
  const trimmed = pubkeyBytes.slice(0, 30);
  const padded = Buffer.concat([Buffer.from([0, 0]), Buffer.from(trimmed)]);
  return "0x" + padded.toString("hex");
}

async function loadKeypair(filePath: string): Promise<KeyPairSigner> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Keypair not found: ${filePath}`);
  }
  const bytes = new Uint8Array(
    JSON.parse(fs.readFileSync(filePath, "utf-8"))
  );
  return createKeyPairSignerFromBytes(bytes);
}

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

let relayerSigner: KeyPairSigner;
let merkleTree: ShieldedPoolMerkleTree;

function saveTreeState(): void {
  const data = JSON.stringify({ leaves: merkleTree.exportLeaves() });
  fs.writeFileSync(TREE_STATE_PATH, data, "utf-8");
}

function loadTreeState(): void {
  if (fs.existsSync(TREE_STATE_PATH)) {
    const data = JSON.parse(fs.readFileSync(TREE_STATE_PATH, "utf-8"));
    if (data.leaves && Array.isArray(data.leaves)) {
      merkleTree.importLeaves(data.leaves);
      console.log(`Loaded ${data.leaves.length} leaves from ${TREE_STATE_PATH}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    leafCount: merkleTree.getLeafCount(),
    relayerAddress: relayerSigner?.address ?? "not loaded",
  });
});

// ---------------------------------------------------------------------------
// POST /api/deposit-notify
// Called by the frontend after a successful deposit to register the commitment
// in the relayer's Merkle tree.
// Body: { commitment: string (hex) }
// ---------------------------------------------------------------------------
app.post("/api/deposit-notify", (req, res) => {
  try {
    const { commitment } = req.body;
    if (!commitment || typeof commitment !== "string") {
      res.status(400).json({ error: "Missing commitment (hex string)" });
      return;
    }

    const commitmentBigint = BigInt(commitment);
    const index = merkleTree.insert(commitmentBigint);
    saveTreeState();

    const root = merkleTree.getRoot();
    console.log(
      `Deposit registered: index=${index}, commitment=${fieldToHex(commitmentBigint)}`
    );

    res.json({
      success: true,
      leafIndex: index,
      root: fieldToHex(root),
      leafCount: merkleTree.getLeafCount(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("deposit-notify error:", message);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/withdraw
// Body: { noteString: string, recipientAddress: string }
// Returns: { txHash: string, explorerUrl: string }
// ---------------------------------------------------------------------------
app.post("/api/withdraw", async (req, res) => {
  try {
    const { noteString, recipientAddress } = req.body;

    if (!noteString || typeof noteString !== "string") {
      res.status(400).json({ error: "Missing noteString" });
      return;
    }
    if (!recipientAddress || typeof recipientAddress !== "string") {
      res.status(400).json({ error: "Missing recipientAddress" });
      return;
    }

    // 1. Parse the note string
    const note = parseNoteString(noteString.trim());
    console.log(
      `\nWithdraw request: amount=${note.amount} lamports, leafIndex=${note.leafIndex}, recipient=${recipientAddress}`
    );

    // 2. Verify the commitment exists in our tree
    if (note.leafIndex >= merkleTree.getLeafCount()) {
      res.status(400).json({
        error: `Leaf index ${note.leafIndex} not found in relayer tree (${merkleTree.getLeafCount()} leaves). Did you notify the relayer of the deposit?`,
      });
      return;
    }

    // 3. Compute derived values
    const commitment = poseidonHash3(note.secret, note.nullifierKey, note.amount);
    const nullifier = poseidonHash2(note.nullifierKey, BigInt(note.leafIndex));
    const root = merkleTree.getRoot();
    const siblings = merkleTree.getProof(note.leafIndex);

    const recipientField = recipientFieldFromPubkey(
      address(recipientAddress)
    );

    console.log(`  Commitment: ${fieldToHex(commitment)}`);
    console.log(`  Nullifier:  ${fieldToHex(nullifier)}`);
    console.log(`  Root:       ${fieldToHex(root)}`);

    // 4. Generate ZK proof via sunspot
    console.log("  Generating ZK proof...");
    const proofResult = generateProof(circuitConfig, {
      root: fieldToHex(root),
      nullifier: fieldToHex(nullifier),
      recipient: recipientField,
      amount: Number(note.amount),
      secret: fieldToHex(note.secret),
      nullifier_key: fieldToHex(note.nullifierKey),
      index: note.leafIndex,
      siblings: siblings.map(fieldToHex),
    });
    console.log("  Proof generated!");

    if (proofResult.proof.length !== 388 || proofResult.publicWitness.length !== 140) {
      throw new Error(
        `Unexpected proof/witness size: proof=${proofResult.proof.length}, witness=${proofResult.publicWitness.length}`
      );
    }

    // 5. Derive PDAs
    const [statePda] = await getProgramDerivedAddress({
      programAddress: SHIELDED_POOL_PROGRAM_ID,
      seeds: [new TextEncoder().encode("pool_state")],
    });
    const [vaultPda] = await getProgramDerivedAddress({
      programAddress: SHIELDED_POOL_PROGRAM_ID,
      seeds: [new TextEncoder().encode("vault")],
    });
    const nullifierBytes = Buffer.from(
      nullifier.toString(16).padStart(64, "0"),
      "hex"
    );
    const [nullifierPda] = await getProgramDerivedAddress({
      programAddress: SHIELDED_POOL_PROGRAM_ID,
      seeds: [new TextEncoder().encode("nullifier"), nullifierBytes],
    });

    // 6. Build withdraw instruction
    const WITHDRAW = 2;
    const data = new Uint8Array(
      1 + proofResult.proof.length + proofResult.publicWitness.length
    );
    data[0] = WITHDRAW;
    data.set(proofResult.proof, 1);
    data.set(proofResult.publicWitness, 1 + proofResult.proof.length);

    const recipientAddr = address(recipientAddress);
    const withdrawIx = {
      programAddress: SHIELDED_POOL_PROGRAM_ID,
      accounts: [
        { address: relayerSigner.address, role: 3 as const }, // payer (relayer)
        { address: recipientAddr, role: 1 as const },          // recipient
        { address: vaultPda, role: 1 as const },                // vault
        { address: statePda, role: 1 as const },                // state
        { address: nullifierPda, role: 1 as const },            // nullifier
        { address: ZK_VERIFIER_PROGRAM_ID, role: 0 as const }, // verifier
        { address: SYSTEM_PROGRAM_ADDRESS, role: 0 as const }, // system
      ],
      data,
    };

    // 7. Submit transaction
    console.log("  Submitting transaction...");
    const rpc = createSolanaRpc(RPC_URL);
    const wsUrl =
      RPC_URL.includes("localhost") || RPC_URL.includes("127.0.0.1")
        ? RPC_URL.replace("http://", "ws://").replace(":8899", ":8900")
        : RPC_URL.replace("https://", "wss://").replace("http://", "ws://");
    const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);
    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    const baseMessage = createTransactionMessage({ version: 0 });
    const messageWithPayer = setTransactionMessageFeePayerSigner(
      relayerSigner,
      baseMessage
    );
    const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
      blockhash,
      messageWithPayer
    );
    const transactionMessage = appendTransactionMessageInstructions(
      [getSetComputeUnitLimitInstruction({ units: 600_000 }), withdrawIx],
      messageWithLifetime
    );
    const messageWithSigners = addSignersToTransactionMessage(
      [],
      transactionMessage
    );
    const signedTx = await signTransactionMessageWithSigners(messageWithSigners);
    assertIsSendableTransaction(signedTx);
    assertIsTransactionWithBlockhashLifetime(signedTx);

    const sig = await sendAndConfirm(signedTx, { commitment: "confirmed" });
    const txHash = sig ?? getSignatureFromTransaction(signedTx);

    const cluster = RPC_URL.includes("devnet") ? "?cluster=devnet" : "";
    const explorerUrl = `https://explorer.solana.com/tx/${txHash}${cluster}`;

    console.log(`  Withdrawal successful! TX: ${explorerUrl}`);

    res.json({
      success: true,
      txHash: String(txHash),
      explorerUrl,
      amount: note.amount.toString(),
      recipient: recipientAddress,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("withdraw error:", message);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tree/status
// Returns current tree state info
// ---------------------------------------------------------------------------
app.get("/api/tree/status", (_req, res) => {
  res.json({
    leafCount: merkleTree.getLeafCount(),
    root: fieldToHex(merkleTree.getRoot()),
  });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function start() {
  console.log("Initializing Poseidon...");
  await initPoseidon();

  console.log("Loading relayer wallet...");
  relayerSigner = await loadKeypair(relayerWalletPath);
  console.log(`Relayer address: ${relayerSigner.address}`);

  console.log("Initializing Merkle tree...");
  merkleTree = new ShieldedPoolMerkleTree();
  loadTreeState();

  console.log(`\nShielded Pool Program: ${SHIELDED_POOL_PROGRAM_ID}`);
  console.log(`ZK Verifier Program:  ${ZK_VERIFIER_PROGRAM_ID}`);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Circuit dir: ${circuitConfig.circuitDir}`);

  app.listen(PORT, () => {
    console.log(`\nRelayer listening on http://localhost:${PORT}`);
    console.log("Endpoints:");
    console.log("  GET  /api/health          — Health check");
    console.log("  POST /api/deposit-notify   — Register new deposit commitment");
    console.log("  POST /api/withdraw         — Generate proof & submit withdrawal TX");
    console.log("  GET  /api/tree/status      — Current Merkle tree status");
  });
}

start().catch((err) => {
  console.error("Failed to start relayer:", err);
  process.exit(1);
});
