/**
 * Browser-compatible note string encoding/decoding.
 *
 * Layout (76 bytes total):
 *   - secret:       32 bytes (big-endian)
 *   - nullifierKey: 32 bytes (big-endian)
 *   - amount:        8 bytes (little-endian, lamports)
 *   - leafIndex:     4 bytes (little-endian)
 *
 * Encoded as: "shield-sol-<base58>"
 */

import bs58 from "bs58";

const NOTE_PREFIX = "shield-sol-";
const NOTE_BYTE_LEN = 76;

export interface NoteData {
  secret: bigint;
  nullifierKey: bigint;
  amount: bigint;
  leafIndex: number;
}

function bigintToBytes32(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytes32ToBigint(bytes: Uint8Array): bigint {
  let hex = "0x";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return BigInt(hex);
}

function writeU64LE(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

function readU64LE(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = 7; i >= 0; i--) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

function writeU32LE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = value & 0xff;
  bytes[1] = (value >> 8) & 0xff;
  bytes[2] = (value >> 16) & 0xff;
  bytes[3] = (value >> 24) & 0xff;
  return bytes;
}

function readU32LE(bytes: Uint8Array): number {
  return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
}

export function generateNoteString(data: NoteData): string {
  const buf = new Uint8Array(NOTE_BYTE_LEN);
  buf.set(bigintToBytes32(data.secret), 0);
  buf.set(bigintToBytes32(data.nullifierKey), 32);
  buf.set(writeU64LE(data.amount), 64);
  buf.set(writeU32LE(data.leafIndex), 72);
  return NOTE_PREFIX + bs58.encode(buf);
}

export function parseNoteString(note: string): NoteData {
  if (!note.startsWith(NOTE_PREFIX)) {
    throw new Error(`Invalid note prefix: expected "${NOTE_PREFIX}"`);
  }

  const encoded = note.slice(NOTE_PREFIX.length);
  const buf = bs58.decode(encoded);

  if (buf.length !== NOTE_BYTE_LEN) {
    throw new Error(
      `Invalid note length: expected ${NOTE_BYTE_LEN} bytes, got ${buf.length}`
    );
  }

  const secret = bytes32ToBigint(buf.slice(0, 32));
  const nullifierKey = bytes32ToBigint(buf.slice(32, 64));
  const amount = readU64LE(buf.slice(64, 72));
  const leafIndex = readU32LE(buf.slice(72, 76));

  return { secret, nullifierKey, amount, leafIndex };
}

/**
 * Generate cryptographically secure random field element (31 bytes to stay
 * safely within the BN254 scalar field).
 */
export function randomField(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(31));
  let hex = "0x";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return BigInt(hex);
}
