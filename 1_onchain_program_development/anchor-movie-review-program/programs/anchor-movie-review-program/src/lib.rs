use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

declare_id!("GPdZB2R1M4pbGs3Emb14ADRXxRezvNAMqZKsYtk57gPR");

const ANCHOR_DISCRIMINATOR: usize = 8;
const STRING_LENGTH_PREFIX: usize = 8;

#[program]
pub mod anchor_movie_review_program {
    use super::*;

    pub fn add_movie_review(
        ctx: Context<AddMovieReview>,
        title: String,
        description: String,
        rating: u8,
    ) -> Result<()> {
        // 到这里的时候, PDA已经被创建
        msg!("movie review account created");

        msg!("title: {}", title);
        msg!("description: {}", description);
        msg!("rating: {}", rating);

        let movie_review = &mut ctx.accounts.movie_review;
        movie_review.reviewer = ctx.accounts.initializer.key();
        movie_review.title = title;
        movie_review.description = description;
        movie_review.rating = rating;

        Ok(())
    }

    pub fn update_movie_review(
        ctx: Context<UpdateMovieReview>,
        title: String,
        description: String,
        rating: u8,
    ) -> Result<()> {
        msg!("movie review account reallocated");
        msg!("title: {}", title);
        msg!("description: {}", description);
        msg!("rating: {}", rating);

        let movie_review = &mut ctx.accounts.movie_review;
        movie_review.rating = rating;
        movie_review.description = description;

        Ok(())
    }

    pub fn delete_movie_review(_ctx: Context<DeleteMovieReview>, title: String) -> Result<()> {
        msg!("movie review of {} account deleted", title);
        Ok(())
    }
}

#[derive(Accounts)]
// 这里的顺序和指令处理函数的参数顺序一致, 必须按照顺序，后面的参数可以省略，前面的参数不能省略
#[instruction(title:String, description:String)]
pub struct AddMovieReview<'info> {
    #[account(
        init,
        seeds = [title.as_bytes(), initializer.key.as_ref()],
        bump,
        payer=initializer,
        space = MovieAccountState::INIT_SPACE + title.len() + description.len()
    )]
    pub movie_review: Account<'info, MovieAccountState>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title:String, description:String)]
pub struct UpdateMovieReview<'info> {
    #[account(
        mut,
        seeds = [title.as_bytes(), initializer.key.as_ref()],
        bump,
        realloc =  MovieAccountState::INIT_SPACE + title.len() + description.len(),
        realloc::payer = initializer,
        realloc::zero = true,
    )]
    pub movie_review: Account<'info, MovieAccountState>,

    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title:String)]
pub struct DeleteMovieReview<'info> {
    #[account(mut,
        seeds = [title.as_bytes(), initializer.key().as_ref()],
        bump,
        close=initializer
    )]
    pub movie_review: Account<'info, MovieAccountState>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct MovieAccountState {
    pub reviewer: Pubkey,
    pub rating: u8,
    pub title: String,
    pub description: String,
}

impl Space for MovieAccountState {
    const INIT_SPACE: usize =
        ANCHOR_DISCRIMINATOR + PUBKEY_BYTES + 1 + STRING_LENGTH_PREFIX + STRING_LENGTH_PREFIX;
}
