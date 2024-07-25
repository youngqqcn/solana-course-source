import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorTokenStakingYqq } from "../target/types/anchor_token_staking_yqq";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    getAccount,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_2022_PROGRAM_ID,
    Account,
} from "@solana/spl-token";
import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Signer,
} from "@solana/web3.js";
import { safeAirdrop } from "./utils/utils";
import { expect } from "chai";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { getLogs } from "@solana-developers/helpers";

describe("anchor-token-staking-yqq", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace
        .AnchorTokenStakingYqq as Program<AnchorTokenStakingYqq>;

    const connection = anchor.getProvider().connection;

    const payer: Signer =
        anchor.workspace.AnchorTokenStakingYqq.provider.wallet.payer;
    console.log(payer.publicKey);
    let stakeTokenMint: PublicKey = undefined;
    let user1: Keypair = Keypair.generate();
    let user2: Keypair = Keypair.generate();
    let user2ATA: Account = undefined;
    // let payerATA: Account = undefined;

    let stakeAmount =  100;

    before(async () => {
        await safeAirdrop(user1.publicKey, connection);
        await safeAirdrop(user2.publicKey, connection);

        stakeTokenMint = await createMint(
            connection,
            payer,
            payer.publicKey,
            payer.publicKey,
            0,
            undefined,
            {
                commitment: connection.commitment,
            },
            TOKEN_2022_PROGRAM_ID
        );
        console.log("stake token: ", stakeTokenMint);

        user2ATA = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            stakeTokenMint,
            user2.publicKey,
            true,
            connection.commitment,
            {
                commitment: connection.commitment,
            },
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log(" user2ATA: ", user2ATA);

        const sig = await mintTo(
            connection,
            payer,
            stakeTokenMint,
            user2ATA.address,
            payer.publicKey,
            stakeAmount,
            [payer],
            {
                commitment: connection.commitment,
            },
            TOKEN_2022_PROGRAM_ID
        );

        console.log("mintTo sig: ", sig.toString());

        let ata = await getAccount(
            connection,
            user2ATA.address,
            connection.commitment,
            TOKEN_2022_PROGRAM_ID
        );
        expect(Number(ata.amount)).to.equal(100);
    });

    it("initialize pool", async () => {
        const sig = await program.methods
            .initializePool()
            .accounts({
                stakeTokenMint: stakeTokenMint, // 质押代币的token mint
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .rpc();

        console.log(sig);
    });
    it("initialize stakeinfo", async () => {
        const sig2 = await program.methods
            .initializeStakeInfo()
            .accounts({
                stakeTokenMint: stakeTokenMint,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .rpc();

        console.log(sig2);
    });

    it("stake", async () => {
        const tx = await program.methods
            .stake(new anchor.BN(stakeAmount))
            .accounts({
                stakeTokenMint: stakeTokenMint,
                payer: user2.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .transaction();

        const sig = await sendAndConfirmTransaction(connection, tx, [user2]);
        console.log(sig);
    });
});
