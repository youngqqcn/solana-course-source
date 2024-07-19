use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{self, Mint, Token, TokenAccount}};

declare_id!("Ri4fJ6rDppVhfqfJcLVvyoNfpge2Kw46eFhYww8vn3j");

#[program]
pub mod bump_seed_canonicalization {


    use token::MintTo;

    use super::*;

    // insecure, allows for creation of multiple accounts for given set of seeds
    pub fn create_user_insecure(ctx: Context<CreateUserInsecure>, bump_seed: u8) -> Result<()> {
        let space = 32 + 1;
        let lamports = Rent::get()?.minimum_balance(space as usize);

        let ix = anchor_lang::solana_program::system_instruction::create_account(
            &ctx.accounts.payer.key(),
            &ctx.accounts.user.key(),
            lamports,
            space,
            &ctx.program_id,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[ctx.accounts.payer.key().as_ref(), &[bump_seed]]],
        )?;

        let mut user = UserInsecure::try_from_slice(&ctx.accounts.user.data.borrow()).unwrap();

        user.auth = ctx.accounts.payer.key();
        user.rewards_claimed = false;
        user.serialize(&mut *ctx.accounts.user.data.borrow_mut())?;

        msg!("User: {}", ctx.accounts.user.key());
        msg!("Auth: {}", user.auth);

        Ok(())
    }

    pub fn claim_insecure(ctx: Context<InsecureClaim>, bump_seed: u8) -> Result<()> {
        let address = Pubkey::create_program_address(
            &[ctx.accounts.payer.key().as_ref(), &[bump_seed]],
            ctx.program_id,
        )
        .unwrap();
        if address != ctx.accounts.user.key() {
            return Err(ProgramError::InvalidArgument.into());
        }

        let mut user = UserInsecure::try_from_slice(&ctx.accounts.user.data.borrow()).unwrap();

        require!(!user.rewards_claimed, ClaimError::AlreadyClaimed);

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[&[
                    "mint".as_bytes(),
                    &[ctx.bumps.mint_authority],
                ]],
            ),
            10,
        )?;

        user.rewards_claimed = true;
        user.serialize(&mut *ctx.accounts.user.data.borrow_mut())?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateUserInsecure<'info> {
    #[account(mut)]
    /// CHECK: intentionally unchecked
    pub user: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InsecureClaim<'info> {
    #[account(mut)]
    /// CHECK: intentionally unchecked
    user: AccountInfo<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    #[account(
        init_if_needed,
        payer=payer,
        associated_token::mint=mint,
        associated_token::authority=payer
    )]
    user_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    mint: Account<'info, Mint>,
    /// CHECK: mint auth PDA
    #[account(seeds = ["mint".as_bytes()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct UserInsecure {
    auth: Pubkey,
    rewards_claimed: bool,
}

#[error_code]
pub enum ClaimError {
    AlreadyClaimed,
}
