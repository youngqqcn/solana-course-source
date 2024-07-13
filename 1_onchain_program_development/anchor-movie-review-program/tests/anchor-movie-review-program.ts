import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorMovieReviewProgram } from "../target/types/anchor_movie_review_program";
import { expect } from "chai";

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

    it("movied added", async () => {
        const tx = await program.methods
            .addMovieReview(movie.title, movie.description, movie.rating)
            .signers([])
            // NOTE: 这里不需要指定 accounts , 由anchor推导
            .rpc();

        const review_data_account =
            await program.account.movieAccountState.fetch(movieReviewPDA);

        expect(movie.title === review_data_account.title);
        expect(movie.description === review_data_account.description);
        expect(movie.rating === review_data_account.rating);
        expect(review_data_account.reviewer === provider.wallet.publicKey);
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
