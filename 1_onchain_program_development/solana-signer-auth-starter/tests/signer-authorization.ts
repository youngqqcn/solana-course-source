import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { SignerAuthorization } from "../target/types/signer_authorization";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";

describe("signer-authorization", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace
        .SignerAuthorization as Program<SignerAuthorization>;
    const connection = anchor.getProvider().connection;
    const wallet = anchor.workspace.SignerAuthorization.provider.wallet;
    const walletFake = anchor.web3.Keypair.generate();
    const tokenAccount = anchor.web3.Keypair.generate();

    const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
    );

    let mint: anchor.web3.PublicKey;
    let withdrawDestinationFake: anchor.web3.PublicKey;

    before(async () => {
        mint = await spl.createMint(
            connection,
            wallet.payer,
            wallet.publicKey,
            null,
            0
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
                // vault: vaultPDA,
                tokenAccount: tokenAccount.publicKey,
                mint: mint,
                authority: wallet.publicKey,
            })
            .signers([tokenAccount])
            .rpc();

        await spl.mintTo(
            connection,
            wallet.payer,
            mint,
            tokenAccount.publicKey,
            wallet.payer,
            100
        );

        const balance = await connection.getTokenAccountBalance(
            tokenAccount.publicKey
        );
        expect(balance.value.uiAmount).to.eq(100);
    });

    it("insecure withdraw", async () => {
        let tx = await program.methods
            .insecureWithdraw()
            .accounts({
                withdrawDestination: withdrawDestinationFake,
            })
            .transaction();

        await anchor.web3.sendAndConfirmTransaction(connection, tx, [
            walletFake, // 使用攻击者的钱包
        ]);

        // 查看
        const balance = await connection.getTokenAccountBalance(
            tokenAccount.publicKey
        );
        // 查看vault的余额
        expect(balance.value.uiAmount).to.equal(0);
    });

    it("secure withdraw expect ok", async () => {
        let tx = await program.methods
            .insecureWithdraw()
            .accounts({
                withdrawDestination: withdrawDestinationFake,
            })
            .rpc();

        // 查看
        const balance = await connection.getTokenAccountBalance(
            tokenAccount.publicKey
        );
        // 查看vault的余额
        expect(balance.value.uiAmount).to.equal(0);
    });

    it("secure withdraw expect fail", async () => {
        try {
            let tx = await program.methods
                .secureWithdraw()
                .accounts({
                    withdrawDestination: withdrawDestinationFake,
                })
                .transaction();

            await anchor.web3.sendAndConfirmTransaction(connection, tx, [
                walletFake, // 使用攻击者的钱包
            ]);

            // 查看
            // const balance = await connection.getTokenAccountBalance(
            //     tokenAccount.publicKey
            // );
            // 查看vault的余额
            // expect(balance.value.uiAmount).to.equal(0);
        } catch (error) {
            expect(error);
            console.error(error);
        }
    });
});
