import {
    LAMPORTS_PER_SOL,
    PublicKey,
    Connection
} from '@solana/web3.js'

export async function safeAirdrop(address: PublicKey, connection: Connection) {
    const acctInfo = await connection.getAccountInfo(address, "confirmed")

    if (acctInfo == null || acctInfo.lamports < LAMPORTS_PER_SOL) {
        let signature = await connection.requestAirdrop(
            address,
            LAMPORTS_PER_SOL
        )
        await connection.confirmTransaction(signature)
    }
}

export async function findNonCanonicalPda(
    seeds: Array<Buffer | Uint8Array>,
    programId: PublicKey
    ): Promise<[PublicKey, number]> {
    const [pda, canonicalBump] = await PublicKey.findProgramAddressSync(seeds, programId)

    let bump = 1
    let address

    while (bump != 256) {
        const seedsWithNonce = seeds.concat(Buffer.from([bump]))
        if (bump != canonicalBump) {
            try{
                address = PublicKey.createProgramAddressSync(seedsWithNonce, programId)
            } catch (err) {
                if (err instanceof TypeError) {
                    throw err
                }
                bump++
                continue
            }
        } else{
            bump++
            continue
        }
        return [address, bump]
    }
    throw new Error(`Unable to find a viable program address nonce`)
}