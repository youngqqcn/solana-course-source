import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'

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