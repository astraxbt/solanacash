/**
 * Browser-compatible Merkle tree for the shielded pool.
 * Mirrors the depth-16 Poseidon Merkle tree used by the on-chain program.
 */

import { poseidonHash2 } from "./poseidon";

const TREE_DEPTH = 16;

export class ShieldedPoolMerkleTree {
  private leaves: bigint[] = [];
  private defaultHashes: bigint[];

  constructor() {
    this.defaultHashes = new Array(TREE_DEPTH + 1);
    this.defaultHashes[0] = 0n; // Empty leaf
    for (let i = 1; i <= TREE_DEPTH; i++) {
      const prev = this.defaultHashes[i - 1];
      this.defaultHashes[i] = poseidonHash2(prev, prev);
    }
  }

  insert(commitment: bigint): number {
    const index = this.leaves.length;
    this.leaves.push(commitment);
    return index;
  }

  getRoot(): bigint {
    let currentLevel = [...this.leaves];
    for (let i = 0; i < TREE_DEPTH; i++) {
      const nextLevel: bigint[] = [];
      for (let j = 0; j < Math.pow(2, TREE_DEPTH - i); j += 2) {
        const left = currentLevel[j] ?? this.defaultHashes[i];
        const right = currentLevel[j + 1] ?? this.defaultHashes[i];
        nextLevel.push(poseidonHash2(left, right));
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  }

  getProof(index: number): bigint[] {
    const proof: bigint[] = [];
    let currentIdx = index;
    let currentLevel = [...this.leaves];

    for (let i = 0; i < TREE_DEPTH; i++) {
      const isRight = currentIdx % 2 === 1;
      const siblingIdx = isRight ? currentIdx - 1 : currentIdx + 1;
      const sibling = currentLevel[siblingIdx] ?? this.defaultHashes[i];
      proof.push(sibling);

      const nextLevel: bigint[] = [];
      for (let j = 0; j < Math.pow(2, TREE_DEPTH - i); j += 2) {
        const left = currentLevel[j] ?? this.defaultHashes[i];
        const right = currentLevel[j + 1] ?? this.defaultHashes[i];
        nextLevel.push(poseidonHash2(left, right));
      }
      currentLevel = nextLevel;
      currentIdx = Math.floor(currentIdx / 2);
    }

    return proof;
  }

  getLeafCount(): number {
    return this.leaves.length;
  }
}
