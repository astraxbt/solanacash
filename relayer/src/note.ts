import bs58 from "bs58";

const NOTE_PREFIX = "shield-sol-";
const NOTE_BYTE_LEN = 76;

export interface NoteData {
  secret: bigint;
  nullifierKey: bigint;
  amount: bigint;
  leafIndex: number;
}

function bytes32ToBigint(bytes: Uint8Array): bigint {
  return BigInt("0x" + Buffer.from(bytes).toString("hex"));
}

export function parseNoteString(note: string): NoteData {
  if (!note.startsWith(NOTE_PREFIX)) {
    throw new Error(`Invalid note prefix: expected "${NOTE_PREFIX}"`);
  }

  const encoded = note.slice(NOTE_PREFIX.length);
  const buf = Buffer.from(bs58.decode(encoded));

  if (buf.length !== NOTE_BYTE_LEN) {
    throw new Error(
      `Invalid note length: expected ${NOTE_BYTE_LEN} bytes, got ${buf.length}`
    );
  }

  const secret = bytes32ToBigint(buf.subarray(0, 32));
  const nullifierKey = bytes32ToBigint(buf.subarray(32, 64));
  const amount = buf.readBigUInt64LE(64);
  const leafIndex = buf.readUInt32LE(72);

  return { secret, nullifierKey, amount, leafIndex };
}
