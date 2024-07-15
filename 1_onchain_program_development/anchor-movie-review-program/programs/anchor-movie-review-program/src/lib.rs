use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

pub mod constant;
pub use constant::*;

declare_id!("GPdZB2R1M4pbGs3Emb14ADRXxRezvNAMqZKsYtk57gPR");

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

        // 调用mint_to
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    authority: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
                &[&["mint".as_bytes(), &[ctx.bumps.mint]]],
            ),
            10 * 10_u64.pow(6),
        )?;

        msg!("Minted tokens");
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

        require!(rating >= 1 && rating <= 5, MovieReviewError::InvalidRating);

        let movie_review = &mut ctx.accounts.movie_review;
        movie_review.rating = rating;
        movie_review.description = description;

        Ok(())
    }

    pub fn delete_movie_review(_ctx: Context<DeleteMovieReview>, title: String) -> Result<()> {
        msg!("movie review of {} account deleted", title);
        Ok(())
    }

    pub fn initialize_token_mint(_ctx: Context<InitializeMint>) -> Result<()> {
        msg!("Token mint initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMint<'info> {
    #[account(
        init,
        payer=user,
        seeds=["mint".as_bytes()],
        bump,
        mint::decimals=6,
        mint::authority=mint, // TODO: 这里的权限为什么设置为mint, 而不是 user ?
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
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
        space = 100 + title.len() + description.len()
    )]
    pub movie_review: Account<'info, MovieAccountState>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,

    // added
    pub token_program: Program<'info, Token>,
    #[account(
        mut,
        seeds = ["mint".as_bytes()],
        bump,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer=initializer,
        associated_token::mint=mint,
        associated_token::authority = initializer,
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(title:String, description:String)]
pub struct UpdateMovieReview<'info> {
    #[account(
        mut,
        seeds = [title.as_bytes(), initializer.key.as_ref()],
        bump,
        realloc =  100 + title.len() + description.len(),
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
        ANCHOR_DISCRIMINATOR + PUBKEY_SIZE + U8_SIZE + STRING_LENGTH_PREFIX + STRING_LENGTH_PREFIX;
}

#[error_code]
enum MovieReviewError {
    #[msg("rating must be between 1 and 5")]
    InvalidRating,
}
