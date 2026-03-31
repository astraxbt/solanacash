import bs58 from "bs58";

/**
 * Note string encoding for the shielded pool.
 *
 * Layout (76 bytes total):
 *   - secret:       32 bytes (big-endian)
 *   - nullifierKey: 32 bytes (big-endian)
 *   - amount:        8 bytes (little-endian, lamports)
 *   - leafIndex:     4 bytes (little-endian)
 *
 * Encoded as: "shield-sol-<base58>"
 */

const NOTE_PREFIX = "shield-sol-";
const NOTE_BYTE_LEN = 76; // 32 + 32 + 8 + 4

export interface NoteData {
    secret: bigint;
    nullifierKey: bigint;
    amount: bigint;
    leafIndex: number;
}

function bigintToBytes32(value: bigint): Uint8Array {
    const hex = value.toString(16).padStart(64, "0");
    return Uint8Array.from(Buffer.from(hex, "hex"));
}

function bytes32ToBigint(bytes: Uint8Array): bigint {
    return BigInt("0x" + Buffer.from(bytes).toString("hex"));
}

export function generateNoteString(data: NoteData): string {
    const buf = Buffer.alloc(NOTE_BYTE_LEN);

    // secret (32 bytes, big-endian)
    buf.set(bigintToBytes32(data.secret), 0);

    // nullifierKey (32 bytes, big-endian)
    buf.set(bigintToBytes32(data.nullifierKey), 32);

    // amount (8 bytes, little-endian)
    buf.writeBigUInt64LE(data.amount, 64);

    // leafIndex (4 bytes, little-endian)
    buf.writeUInt32LE(data.leafIndex, 72);

    return NOTE_PREFIX + bs58.encode(buf);
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
