/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Browser-compatible Poseidon hash wrapper using circomlibjs.
 * circomlibjs builds the BN254 Poseidon permutation via WASM (ffjavascript),
 * so it works in any modern browser without Node.js dependencies.
 */

let poseidonInstance: any = null;
let initPromise: Promise<void> | null = null;

export async function initPoseidon(): Promise<void> {
  if (poseidonInstance) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { buildPoseidon } = await import("circomlibjs");
    poseidonInstance = await buildPoseidon();
  })();

  return initPromise;
}

function getPoseidon(): any {
  if (!poseidonInstance) {
    throw new Error("Poseidon not initialized. Call initPoseidon() first.");
  }
  return poseidonInstance;
}

export function poseidonHash2(left: bigint, right: bigint): bigint {
  const poseidon = getPoseidon();
  const hash = poseidon([left, right]);
  return poseidon.F.toObject(hash) as bigint;
}

export function poseidonHash3(a: bigint, b: bigint, c: bigint): bigint {
  const poseidon = getPoseidon();
  const hash = poseidon([a, b, c]);
  return poseidon.F.toObject(hash) as bigint;
}
