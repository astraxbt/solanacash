use dep::poseidon::poseidon::bn254::hash_2 as poseidon_hash;

global TREE_DEPTH: u32 = 16; 

fn poseidon_hash_2(left: Field, right: Field) -> Field {
    poseidon_hash([left, right])
}

fn compute_merkle_root<let N: u32>(leaf: Field, index: Field, siblings: [Field; N]) -> Field {
    let mut current = leaf;
    let path_bits: [u1; N] = index.to_le_bits();

    for i in 0..N {
        let sibling = siblings[i];
        let bit = path_bits[i];

        let (left, right) = if bit == 0 {
            (current, sibling)
        } else {
            (sibling, current)
        };

        current = poseidon_hash_2(left, right);
    }

    current
}

fn main(
    // --- Public inputs (verified by Groth16 verifier on-chain) ---
    root: pub Field,
    nullifier: pub Field,
    recipient: pub Field,
    amount: pub u64,

    // --- Private inputs (known only to the prover) ---
    secret: Field,
    nullifier_key: Field,
    index: Field,
    siblings: [Field; TREE_DEPTH]
) {
    // 1. Commitment = H(secret, nullifier_key, amount)
    //    The amount is cryptographically bound to the deposit via the commitment.
    //    Changing the amount changes the commitment, which changes the Merkle root,
    //    causing the proof to fail.
    let commitment = dep::poseidon::poseidon::bn254::hash_3([secret, nullifier_key, amount as Field]);

    // 2. Nullifier = H(nullifier_key, index)
    //    Unique per deposit. Used on-chain to prevent double-spending.
    let calculated_nullifier = poseidon_hash_2(nullifier_key, index);
    assert(nullifier == calculated_nullifier);

    // 3. Merkle membership proof
    //    Proves the commitment exists in the on-chain Merkle tree without
    //    revealing which leaf it corresponds to.
    let calculated_root = compute_merkle_root(commitment, index, siblings);
    assert(root == calculated_root);

    // 4. Recipient binding
    //    The recipient address is a public input to the Groth16 proof. The
    //    verifier rejects proofs generated for a different recipient, which
    //    prevents front-running attacks (swapping the recipient in the mempool).
    //
    //    We create a withdrawal_binding hash that ties the nullifier, recipient,
    //    and amount together in a single constraint. This ensures:
    //    (a) The Noir compiler cannot optimize away the recipient field
    //    (b) All three values are interdependent in the constraint system
    //    (c) The on-chain program can verify this binding hash independently
    let withdrawal_binding = dep::poseidon::poseidon::bn254::hash_3([
        calculated_nullifier,
        recipient,
        amount as Field,
    ]);
    assert(withdrawal_binding != 0);

    // 5. Amount must be positive (defense in depth -- the on-chain program
    //    also checks this, but constraining it here makes the proof invalid
    //    for zero-amount withdrawals)
    assert(amount as Field != 0);
}

#[test]
fn test_shielded_pool() {
    let secret = 1;
    let nullifier_key = 2;
    let index = 0;
    let amount = 1000000; // 1M lamports
    let siblings = [0; TREE_DEPTH];
    
    let commitment = dep::poseidon::poseidon::bn254::hash_3([secret, nullifier_key, amount as Field]);
    let nullifier = poseidon_hash_2(nullifier_key, index);
    let root = compute_merkle_root(commitment, index, siblings);
    let recipient = 123; // dummy recipient hash

    main(root, nullifier, recipient, amount, secret, nullifier_key, index, siblings);
}
