import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
// import { AnchorAdminInstruction } from "../target/types/anchor_admin_instruction";
import fs from "fs";
import { assert } from "chai";
import { AnchorAdminInstruction } from "../target/types/anchor_admin_instruction";
import { getKeypairFromFile } from "@solana-developers/helpers";

describe("anchor-admin-instruction", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(anchor.AnchorProvider.env());
    anchor.setProvider(anchor.AnchorProvider.env());
    const connection = anchor.getProvider().connection;

    const program = anchor.workspace
        .AnchorAdminInstruction as Program<AnchorAdminInstruction>;

    const sender = anchor.web3.Keypair.generate();
    const receiver = anchor.web3.Keypair.generate();

    let feeDestination: anchor.web3.PublicKey;
    let senderTokenAccount: anchor.web3.PublicKey;
    let receiverTokenAccount: anchor.web3.PublicKey;

    before(async () => {
        const wallet = await getKeypairFromFile(
            "/home/yqq/.config/solana/id.json"
        );

        let data = fs.readFileSync(
            "env9JiVQgUQMLt7Qekm8VEwyp2Wzds7ht7UpcmmiR1V.json"
        );

        let keypair = anchor.web3.Keypair.fromSecretKey(
            new Uint8Array(JSON.parse(data.toString()))
        );

        const mint = await spl.createMint(
            connection,
            wallet,
            wallet.publicKey,
            null,
            0,
            keypair
        );

        feeDestination = await spl.createAccount(
            connection,
            wallet,
            mint,
            wallet.publicKey
        );

        senderTokenAccount = await spl.createAccount(
            connection,
            wallet,
            mint,
            sender.publicKey
        );

        receiverTokenAccount = await spl.createAccount(
            connection,
            wallet,
            mint,
            receiver.publicKey
        );

        await spl.mintTo(
            connection,
            wallet,
            mint,
            senderTokenAccount,
            wallet,
            10000
        );

        const transactionSignature = await connection.requestAirdrop(
            sender.publicKey,
            1 * anchor.web3.LAMPORTS_PER_SOL
        );

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();

        await connection.confirmTransaction(
            {
                blockhash,
                lastValidBlockHeight,
                signature: transactionSignature,
            },
            "confirmed"
        );
    });

    it("Payment completes successfully", async () => {
        const tx = await program.methods
            .payment(new anchor.BN(10000))
            .accounts({
                feeDestination: feeDestination,
                senderTokenAccount: senderTokenAccount,
                receiverTokenAccount: receiverTokenAccount,
                sender: sender.publicKey,
            })
            .transaction();
        await anchor.web3.sendAndConfirmTransaction(connection, tx, [sender]);
        assert.strictEqual(
            (await connection.getTokenAccountBalance(senderTokenAccount)).value
                .uiAmount,
            0
        );
        assert.strictEqual(
            (await connection.getTokenAccountBalance(feeDestination)).value
                .uiAmount,
            100
        );
        assert.strictEqual(
            (await connection.getTokenAccountBalance(receiverTokenAccount))
                .value.uiAmount,
            9900
        );
    });
});
