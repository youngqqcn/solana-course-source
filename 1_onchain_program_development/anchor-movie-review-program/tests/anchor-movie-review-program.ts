import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorMovieReviewProgram } from "../target/types/anchor_movie_review_program";
import { expect } from "chai";
import {
    getAccount,
    getAssociatedTokenAddress,
    getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

describe("anchor-movie-review-program", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace
        .AnchorMovieReviewProgram as Program<AnchorMovieReviewProgram>;

    const movie = {
        title: "Fuckman",
        description: "Wow what a good movie it was real great",
        rating: 5,
    };

    const [movieReviewPDA, bump] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(movie.title), provider.wallet.publicKey.toBytes()],
        program.programId
    );

    const [tokenMint, _] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint")],
        program.programId
    );

    it("initializes the reward token", async () => {
        const tx = await program.methods.initializeTokenMint().rpc();
        console.log(tx);
    });

    it("movied added", async () => {
        const tokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            provider.wallet.publicKey
        );

        const tx = await program.methods
            .addMovieReview(movie.title, movie.description, movie.rating)
            .accounts({
                // tokenAccount: tokenAccount,
            })
            // NOTE: 这里不需要指定 accounts , 由anchor推导
            .rpc();

        const review_data_account =
            await program.account.movieAccountState.fetch(movieReviewPDA);

        expect(movie.title === review_data_account.title);
        expect(movie.description === review_data_account.description);
        expect(movie.rating === review_data_account.rating);
        expect(review_data_account.reviewer === provider.wallet.publicKey);

        const ata = await getAccount(provider.connection, tokenAccount);
        expect(Number(ata.amount)).to.equal(10 * Math.pow(10, 6));
    });
    it("movied updated", async () => {
        const newDescription = "helloworld";
        const newRating = 1;
        const tx = await program.methods
            .updateMovieReview(movie.title, newDescription, newRating)
            .signers([])
            .rpc();

        const review_data_account =
            await program.account.movieAccountState.fetch(movieReviewPDA);

        expect(movie.title === review_data_account.title);
        expect(newDescription === review_data_account.description);
        expect(newRating === review_data_account.rating);
        expect(review_data_account.reviewer === provider.wallet.publicKey);
    });
    it("movied deleted", async () => {
        const tx = await program.methods
            .deleteMovieReview(movie.title)
            .signers([])
            .rpc();
    });
});
