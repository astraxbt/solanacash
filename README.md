# Shielded Pool (Noir + Pinocchio) on Solana

Private SOL transfers using a Noir circuit for proof generation and a Pinocchio-based on-chain program for deposit/withdraw logic. Proofs are verified on-chain via a Sunspot Groth16 verifier program.

## Architecture Overview

```
Shielded Pool (repo)
├─ noir_circuit/
│  ├─ nargo execute -> witness (.gz)
│  └─ sunspot prove -> proof (.proof) + public witness (.pw)
├─ verifier program (Sunspot Groth16)
│  └─ verifies proof + public witness
└─ shielded_pool_program/
   ├─ initialize/deposit/withdraw
   ├─ checks root/nullifier/recipient/amount
   └─ CPI to verifier program
```

***DISCLAIMER: This repository has not been audited. Use at your own risk.***

### Flow Summary

1) **Initialize**: admin creates state + vault PDAs.  
2) **Deposit**: sender transfers SOL into the vault and updates the Merkle root. Receives a **note string** encoding their secrets.  
3) **Withdraw**: relayer submits proof on behalf of the recipient. The program verifies the ZK proof, consumes the nullifier, and releases the full withdrawal amount to the recipient. The relayer pays the TX fee and nullifier PDA rent.

Privacy comes from the ZK proof: the withdraw does not require the sender to sign, and the nullifier prevents double spend. The recipient is chosen at withdrawal time, not deposit time.

#### Privacy Notes

This is **not** a full anonymity system for SOL transfers on its own. Practical privacy depends on:

- Pool size and volume (more deposits/withdrawals = larger anonymity set)
- Transaction frequency and timing correlation
- Unique wallet count interacting with the pool
- Delay between deposit and withdraw
- Fixed denominations (UI/UX should encourage standardized amounts)

## Prerequisites

- [Nargo](https://noir-lang.org/docs/getting_started/noir_installation) `1.0.0-beta.13`
- [Sunspot](https://github.com/reilabs/sunspot) (Go 1.24+)
- [Solana CLI](https://solana.com/docs/intro/installation)
- Node.js 18+ (for the client)

Example setup:

```bash
# Noir
noirup -v 1.0.0-beta.13

# Sunspot
git clone https://github.com/reilabs/sunspot.git ~/sunspot
cd ~/sunspot/go && go build -o sunspot .
export PATH="$HOME/sunspot/go:$PATH"
export GNARK_VERIFIER_BIN="$HOME/sunspot/gnark-solana/crates/verifier-bin"
```

## Project Structure

```
.
├── noir_circuit/               # Noir circuit + proving artifacts
│   ├── src/main.nr
│   ├── Prover.toml
│   └── target/                 # .json/.ccs/.pk/.vk/.proof/.pw
├── shielded_pool_program/      # Pinocchio program (initialize/deposit/withdraw)
├── client/                     # TS integration test + helper scripts
└── keypair/                    # Local keypairs (ignored by git)
```

## Keypairs and Airdrop

Create the sender and relayer keypairs (relayer is only needed for the `initialize` instruction):

```bash
solana-keygen new --outfile keypair/sender.json --no-bip39-passphrase -s
solana-keygen new --outfile keypair/relayer.json --no-bip39-passphrase -s

solana airdrop 2 $(solana address -k keypair/sender.json) --url devnet
solana airdrop 2 $(solana address -k keypair/relayer.json) --url devnet
```

## Build and Deploy

### 1) Circuit artifacts (Noir + Sunspot)

If you modify the circuit or clone this repository for the first time, you need to generate the artifacts:

```bash
cd noir_circuit
nargo compile
nargo execute
sunspot compile target/shielded_pool_verifier.json
sunspot setup target/shielded_pool_verifier.ccs
sunspot prove target/shielded_pool_verifier.json target/shielded_pool_verifier.gz target/shielded_pool_verifier.ccs target/shielded_pool_verifier.pk
sunspot deploy target/shielded_pool_verifier.vk
```

`sunspot deploy` outputs a verifier program `.so` you can deploy to Solana.  

### 2) Deploy the verifier program

```bash
solana program deploy path/to/verifier.so --url devnet
```

### 3) Build & deploy the shielded pool program

Before building, update the verifier program ID in
`shielded_pool_program/src/instructions/withdraw.rs` to match the verifier you just deployed.

```bash
cargo build-sbf --manifest-path shielded_pool_program/Cargo.toml
solana program deploy shielded_pool_program/target/deploy/shielded_pool_pinocchio.so --url devnet
```

## Run the Integration Test

The client requires program IDs via env vars.

```bash
RPC_URL=https://api.devnet.solana.com \
ZK_VERIFIER_PROGRAM_ID=<verifier_program_id> \
SHIELDED_POOL_PROGRAM_ID=<shielded_pool_program_id> \
pnpm --dir client run test-shielded-pool
```

## Notes

- **Relayer architecture**: the relayer pays transaction fees and nullifier PDA rent for withdrawals. The recipient receives the full deposit amount. In the future, anyone who stakes the protocol token can become a relayer.
- **Note string**: on deposit, a portable note string is generated encoding the user's secrets (`shield-sol-<base58>`). The user saves this string and uses it to withdraw from any wallet.
- **Sender privacy**: the sender signs only the deposit. Withdraw uses proof verification and nullifier checks instead of a sender signature.
- **Proof size**: current proofs are 388 bytes, plus a 140-byte public witness.
- **Upgradeable**: the program is deployed with upgrade authority, allowing new features to be added without redeployment or loss of existing deposits.

## Upgrade Log

This section tracks all upgrades to the on-chain program and circuit, starting from the barebones v1.

### v1.0 — Base Implementation

- Noir ZK circuit with Groth16 verification via Sunspot
- Deposit: sender transfers SOL + commitment into vault, Merkle tree updated on-chain
- Withdraw: relayer submits proof, program verifies via CPI to verifier, nullifier consumed, SOL released to recipient
- Note string generation (`shield-sol-<base58>`) for portable secret storage
- Poseidon hash for commitments and nullifiers (ZK-friendly)
- Depth-16 Merkle tree (65,536 leaf capacity)
- Double-spend prevention via nullifier PDAs

### v1.1 — Recipient + Amount Binding (PR #4)

- **Circuit**: Strengthened recipient and amount binding in the ZK proof
  - Added `withdrawal_binding = H(nullifier, recipient, amount)` constraint that ties all three values together in the constraint system
  - Ensures the Noir compiler cannot optimize away the recipient field from the proof
  - Added explicit `amount != 0` constraint (defense in depth)
  - Replaced weak `assert(recipient != 0)` with a Poseidon hash binding
- **Program**: Restored relayer architecture for withdrawals
  - Relayer pays TX fees and nullifier PDA rent
  - Recipient receives the full withdrawal amount (no deductions)
  - Prepares for future relayer staking/registry system
- **Test client**: Updated for relayer-based withdrawal flow, WebSocket port fix for local validator

### Planned Upgrades

- **Pool Pause**: Admin can pause/unpause deposits and withdrawals
- **Fixed Denominations**: On-chain enforcement of fixed pool sizes (0.1, 1, 10, 100 SOL)
- **Admin Transfer**: Transfer upgrade authority to a new admin
- **Relayer Withdrawal Fee**: On-chain fee mechanism for relayers
- **Cross-Pool Atomic Swaps**: Atomically swap between denomination pools (research)
- **Relayer Registry**: Stake protocol tokens to become a relayer

## Resources

- [Noir Documentation](https://noir-lang.org/docs/)
- [Sunspot Repository](https://github.com/reilabs/sunspot)
-  [Solana Noir Examples
](https://github.com/solana-foundation/noir-examples)
- [Pinocchio Library](https://github.com/anza-xyz/pinocchio)
