import { web3 } from "@coral-xyz/anchor"
import { LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js"

export async function safeAirdrop(address: PublicKey, connection: Connection) {
  const acctInfo = await connection.getAccountInfo(address, "confirmed")

  if (acctInfo == null || acctInfo.lamports < LAMPORTS_PER_SOL) {
    let signature = await connection.requestAirdrop(address, LAMPORTS_PER_SOL)

    await connection.confirmTransaction(signature)
  }
}

export function getCharacterKey(auth: PublicKey, program: PublicKey) {
  return web3.PublicKey.findProgramAddressSync([auth.toBuffer()], program)
}

export function getMetadataKey(
  auth: PublicKey,
  gameplayProgram: PublicKey,
  metadataProgram: PublicKey
) {
  const [characterKey] = getCharacterKey(auth, gameplayProgram)

  return web3.PublicKey.findProgramAddressSync([characterKey.toBuffer()], metadataProgram)
}