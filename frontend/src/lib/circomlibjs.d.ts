declare module "circomlibjs" {
  export function buildPoseidon(): Promise<Poseidon>;
  export interface Poseidon {
    (inputs: bigint[]): Uint8Array;
    F: {
      toObject(val: Uint8Array): bigint;
    };
  }
}
