import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorCounterPlus } from "../target/types/anchor_counter_plus";
import { expect } from "chai";

describe("anchor-counter-plus", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace
        .AnchorCounterPlus as Program<AnchorCounterPlus>;

    const counterPDA = anchor.web3.Keypair.generate();
    it("initialized!", async () => {
        // Add your test here.
        const tx = await program.methods
            .initialize()
            .accounts({
                counterAccount: counterPDA.publicKey,
            })
            .signers([counterPDA])
            .rpc();
        console.log("Your transaction signature", tx);

        let counter = await program.account.counterPlus.fetch(
            counterPDA.publicKey
        );

        expect(counter.counter.toNumber()).to.equal(0);
    });

    it("increment", async () => {
        let tx = await program.methods
            .increment()
            .accounts({
                counterAccount: counterPDA.publicKey,
                user: provider.publicKey,
            })
            .signers([])
            .rpc();

        let counter = await program.account.counterPlus.fetch(
            counterPDA.publicKey
        );

        expect(counter.counter.toNumber()).to.equal(1);
    });

    it("decrements the counter", async () => {
        await program.methods
            .decrement()
            .accounts({
                counterAccount: counterPDA.publicKey,
                user: provider.publicKey,
            })
            .signers([])
            .rpc();

        expect(
            (
                await program.account.counterPlus.fetch(counterPDA.publicKey)
            ).counter.toNumber()
        ).to.equal(0);
    });
});
