import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorCounter } from "../target/types/anchor_counter";
import { expect } from "chai";

describe("anchor-counter", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.AnchorCounter as Program<AnchorCounter>;

    const counter = anchor.web3.Keypair.generate();
    console.log("counter pubkey: ", counter.publicKey.toBase58());

    const user = anchor.web3.Keypair.generate();

    it("initialized", async () => {
        // Add your test here.
        const tx = await program.methods
            .initialize()
            .accounts({
                counter: counter.publicKey,
            })
            .signers([counter]) // TODO: 为什么需要传counter?
            .rpc();
        console.log("Your transaction signature", tx);
    });

    it("Increment", async () => {
        const tx = await program.methods
            .increment()
            .accounts({
                counter: counter.publicKey,
                user: provider.wallet.publicKey,
            })
            .signers([])
            .rpc();

        const account = await program.account.counter.fetch(counter.publicKey);
        expect(account.count.toNumber()).to.equal(1);
    });
});
