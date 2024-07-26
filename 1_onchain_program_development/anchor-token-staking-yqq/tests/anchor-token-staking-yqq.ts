import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { AnchorTokenStakingYqq } from "../target/types/anchor_token_staking_yqq";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    getAccount,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_2022_PROGRAM_ID,
    Account,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Signer,
} from "@solana/web3.js";
import { safeAirdrop } from "./utils/utils";
import { assert, expect } from "chai";
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
    let hacker: Keypair = Keypair.generate();
    let user2: Keypair = Keypair.generate();
    let user2ATA: Account = undefined;
    // let payerATA: Account = undefined;
    // 获取用户 user2 stake_info  PDA地址

    let stakeAmount = 100;
    let rewardsRatio = 100; // 100倍

    before(async () => {
        await safeAirdrop(hacker.publicKey, connection);
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

        console.log(" user2ATA: ", user2ATA.address.toBase58());

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

    it("initialize pool with token mint owner, epected ok", async () => {
        const sig = await program.methods
            .initializePool()
            .accounts({
                stakeTokenMint: stakeTokenMint, // 质押代币的token mint
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .rpc();

        console.log(sig);
    });

    it("initialize pool with hacker, epected failed", async () => {
        const fakeStakeTokenMint = await createMint(
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
        console.log("fakeStakeTokenMint: ", fakeStakeTokenMint.toBase58());

        try {
            const tx = await program.methods
                .initializePool()
                .accounts({
                    stakeTokenMint: fakeStakeTokenMint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    payer: hacker.publicKey,
                })
                .transaction();

            await sendAndConfirmTransaction(connection, tx, [hacker]);

            assert.fail("expected failed transaction");
        } catch (error) {
            // console.error(error.message);
            expect(error.message).include(
                "A mint mint authority constraint was violated"
            );
        }
    });

    it("initialize pool with different Token Program, epected failed", async () => {
        const fakeStakeTokenMint = await createMint(
            connection,
            payer,
            payer.publicKey,
            payer.publicKey,
            0,
            undefined,
            {
                commitment: connection.commitment,
            },
            TOKEN_PROGRAM_ID // 故意用不一样的 programId
        );
        console.log("fakeStakeTokenMint: ", fakeStakeTokenMint);

        try {
            const tx = await program.methods
                .initializePool()
                .accounts({
                    stakeTokenMint: fakeStakeTokenMint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID, //  故意不一样 programId
                    payer: payer.publicKey,
                })
                .transaction();

            await sendAndConfirmTransaction(connection, tx, [payer]);

            assert.fail("expected failed transaction");
        } catch (error) {
            // console.error(error.message);
            expect(error.message).to.include(
                "incorrect program id for instruction"
            );
        }
    });

    it("initialize stakeinfo", async () => {
        const tx = await program.methods
            .initializeStakeInfo()
            .accounts({
                stakeTokenMint: stakeTokenMint,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                payer: user2.publicKey, // 必须指定payer
                // stakeInfo: user2StakeInfoPDA,
            })
            .transaction();

        await sendAndConfirmTransaction(connection, tx, [user2]);
    });

    it("stake expect ok", async () => {
        const [user2StakeInfoPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("STAKE_INFO"),
                stakeTokenMint.toBuffer(),
                user2.publicKey.toBuffer(),
            ],
            program.programId
        );

        const tx = await program.methods
            .stake(new anchor.BN(stakeAmount))
            .accounts({
                stakeTokenMint: stakeTokenMint,
                payer: user2.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                stakeInfo: user2StakeInfoPDA,
            })
            .transaction();

        const sig = await sendAndConfirmTransaction(connection, tx, [user2]);
        console.log(sig);

        console.log(await getLogs(connection, sig));

        let user2AtaInfo = await getAccount(
            connection,
            user2ATA.address,
            connection.commitment,
            TOKEN_2022_PROGRAM_ID
        );
        expect(Number(user2AtaInfo.amount)).to.equal(0);
    });

    it("unstake expect ok", async () => {
        const unstakeAmount = Math.floor(stakeAmount / 2);

        const tx = await program.methods
            .unstake(new anchor.BN(unstakeAmount))
            .accounts({
                stakeTokenMint: stakeTokenMint,
                payer: user2.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .transaction();

        const sig = await sendAndConfirmTransaction(connection, tx, [user2]);
        console.log(sig);

        console.log(await getLogs(connection, sig));

        // 查询质押token是否有退还
        let user2AtaInfo = await getAccount(
            connection,
            user2ATA.address,
            connection.commitment,
            TOKEN_2022_PROGRAM_ID
        );
        expect(Number(user2AtaInfo.amount)).to.equal(unstakeAmount);

        // 查询奖励
        console.log("stakeTokenMint: ", stakeTokenMint.toBase58());
        const [rewardsTokenMint] = PublicKey.findProgramAddressSync(
            [Buffer.from("REWARDS_TOKEN_SEED"), stakeTokenMint.toBuffer()],
            program.programId
        );
        console.log("rewardsTokenMint: ", rewardsTokenMint.toBase58());

        let [user2RewardsATA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("USER_REWARDS_ATA_SEED"),
                stakeTokenMint.toBuffer(),
                user2.publicKey.toBuffer(),
            ],
            program.programId
        );

        console.log("user2RewardsATA: ", user2RewardsATA.toBase58());

        let rewardsAtaInfo = await getAccount(
            connection,
            user2RewardsATA,
            connection.commitment,
            TOKEN_2022_PROGRAM_ID
        );

        expect(Number(rewardsAtaInfo.amount)).to.equal(
            unstakeAmount * rewardsRatio
        );
    });

    it("stake with other stake_info", async () => {
        const hackerATA = await getOrCreateAssociatedTokenAccount(
            connection,
            hacker,
            stakeTokenMint,
            hacker.publicKey,
            true,
            connection.commitment,
            {
                commitment: connection.commitment,
            },
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // console.log(" hackerATA: ", hackerATA);

        await mintTo(
            connection,
            hacker,
            stakeTokenMint,
            hackerATA.address,
            payer.publicKey,
            stakeAmount,
            [hacker, payer],
            {
                commitment: connection.commitment,
            },
            TOKEN_2022_PROGRAM_ID
        );

        // 获取用户 user2 stake_info  PDA地址
        const [user2StakeInfoPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("STAKE_INFO"),
                stakeTokenMint.toBuffer(),
                user2.publicKey.toBuffer(),
            ],
            program.programId
        );

        const tx1 = await program.methods
            .initializeStakeInfo()
            .accounts({
                stakeTokenMint: stakeTokenMint,
                payer: hacker.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .transaction();
        await sendAndConfirmTransaction(connection, tx1, [hacker]);

        // 获取stakeInfo PDA
        const [hackerStakeInfoPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("STAKE_INFO"),
                stakeTokenMint.toBuffer(),
                hacker.publicKey.toBuffer(),
            ],
            program.programId
        );

        console.log(
            "===========hackerStakeInfoPDA : ",
            hackerStakeInfoPDA.toBase58()
        );

        const hackerStakeInfo = await program.account.stakeInfo.fetch(
            hackerStakeInfoPDA
        );

        try {
            const tx = await program.methods
                .stake(new anchor.BN(1))
                .accounts({
                    stakeTokenMint: stakeTokenMint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    stakeInfo: user2StakeInfoPDA,
                    payer: hacker.publicKey,
                })
                .transaction();

            await sendAndConfirmTransaction(connection, tx, [hacker]);
            expect.fail("expected fail");
        } catch (error) {
            // console.error(error);

            // expect(error.message).to.include("stake user account not match");
            expect(error);
        }
    });

    it("new user stake", async () => {
        const tmpUser = Keypair.generate();

        await safeAirdrop(tmpUser.publicKey, connection);

        const tmpUserATA = await getOrCreateAssociatedTokenAccount(
            connection,
            tmpUser,
            stakeTokenMint,
            tmpUser.publicKey,
            true,
            connection.commitment,
            {
                commitment: connection.commitment,
            },
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log(" tmpUserATA: ", tmpUserATA.address.toBase58());

        await mintTo(
            connection,
            tmpUser,
            stakeTokenMint,
            tmpUserATA.address,
            payer.publicKey,
            stakeAmount,
            [tmpUser, payer],
            {
                commitment: connection.commitment,
            },
            TOKEN_2022_PROGRAM_ID
        );

        const tx1 = await program.methods
            .initializeStakeInfo()
            .accounts({
                stakeTokenMint: stakeTokenMint,
                payer: tmpUser.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .transaction();
        await sendAndConfirmTransaction(connection, tx1, [tmpUser]);

        const [poolStatePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("POOL_STATE_SEED"), stakeTokenMint.toBuffer()],
            program.programId
        );

        const [stakeInfoPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("STAKE_INFO"),
                stakeTokenMint.toBuffer(),
                tmpUser.publicKey.toBuffer(),
            ],
            program.programId
        );

        const poolStateOld = await program.account.poolState.fetch(
            poolStatePDA
        );
        const stakeInfoOld = await program.account.stakeInfo.fetch(
            stakeInfoPDA
        );

        const tx_stake = await program.methods
            .stake(new anchor.BN(stakeAmount))
            .accounts({
                stakeTokenMint: stakeTokenMint,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                payer: tmpUser.publicKey,
                userStakeTokenAta: tmpUserATA.address,
            })
            .transaction();

        await sendAndConfirmTransaction(connection, tx_stake, [tmpUser]);

        const [tmpUserStakeInfoPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("STAKE_INFO"),
                stakeTokenMint.toBuffer(),
                tmpUser.publicKey.toBuffer(),
            ],
            program.programId
        );
        const [user2StakeInfoPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("STAKE_INFO"),
                stakeTokenMint.toBuffer(),
                user2.publicKey.toBuffer(),
            ],
            program.programId
        );

        const tmpUserStakeInfo = await program.account.stakeInfo.fetch(
            tmpUserStakeInfoPDA
        );

        // 判断金额
        expect(tmpUserStakeInfo.stakeAmount.toNumber()).to.equal(stakeAmount);
        expect(tmpUserStakeInfo.stakeTokenMint.toBase58()).to.equal(
            stakeTokenMint.toBase58()
        );
        expect(tmpUserStakeInfoPDA.toBase58()).not.equal(
            user2StakeInfoPDA.toBase58()
        );

        const poolStateNew = await program.account.poolState.fetch(
            poolStatePDA
        );
        const stakeInfoNew = await program.account.stakeInfo.fetch(
            stakeInfoPDA
        );

        expect(poolStateNew.totalStake.toNumber()).to.equal(
            poolStateOld.totalStake.toNumber() + stakeAmount
        );

        expect(stakeInfoNew.stakeAmount.toNumber()).to.equal(
            stakeInfoOld.stakeAmount.toNumber() + stakeAmount
        );

        // unstake
        const tx_unstake = await program.methods
            .unstake(new anchor.BN(stakeAmount))
            .accounts({
                stakeTokenMint: stakeTokenMint,
                payer: tmpUser.publicKey,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
            .transaction();

        const sig = await sendAndConfirmTransaction(connection, tx_unstake, [
            tmpUser,
        ]);
        console.log(sig);

        // console.log(await getLogs(connection, sig));

        // 查询质押token是否有退还
        let tmpUserAtaInfo = await getAccount(
            connection,
            tmpUserATA.address,
            connection.commitment,
            TOKEN_2022_PROGRAM_ID
        );
        expect(Number(tmpUserAtaInfo.amount)).to.equal(stakeAmount);

        // 查询质押奖励
        let [tmpUserRewardsATA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("USER_REWARDS_ATA_SEED"),
                stakeTokenMint.toBuffer(),
                tmpUser.publicKey.toBuffer(),
            ],
            program.programId
        );

        console.log("tmpUserRewardsATA: ", tmpUserRewardsATA.toBase58());

        let rewardsAtaInfo = await getAccount(
            connection,
            tmpUserRewardsATA,
            connection.commitment,
            TOKEN_2022_PROGRAM_ID
        );

        expect(Number(rewardsAtaInfo.amount)).to.equal(
            stakeAmount * rewardsRatio
        );

        const poolStateLatest = await program.account.poolState.fetch(
            poolStatePDA
        );
        const stakeInfoLatest = await program.account.stakeInfo.fetch(
            stakeInfoPDA
        );

        expect(poolStateLatest.totalStake.toNumber()).to.equal(
            poolStateOld.totalStake.toNumber()
        );

        expect(stakeInfoLatest.stakeAmount.toNumber()).to.equal(
            stakeInfoOld.stakeAmount.toNumber()
        );
    });

    it("update stake ratio, expect ok", async () => {
        // 10倍
        const new_ratio = 1000;
        await program.methods
            .updateStakeRatio(new_ratio)
            .accounts({
                stakeTokenMint: stakeTokenMint,
                admin: payer.publicKey,
            })
            .rpc();

        const [poolStatePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("POOL_STATE_SEED"), stakeTokenMint.toBuffer()],
            program.programId
        );

        const poolStateLatest = await program.account.poolState.fetch(
            poolStatePDA
        );

        expect(poolStateLatest.rewardsRatio).to.equal(new_ratio);
    });
});
