use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

declare_id!("DJmUSrWW2GE4fwy9f83utRmzvVjeozZv8CSVcmB6TwBJ");

#[program]
pub mod solana_pda_sharing {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>, bump: u8) -> Result<()> {
        ctx.accounts.pool.vault = ctx.accounts.vault.key();
        ctx.accounts.pool.mint = ctx.accounts.mint.key();
        ctx.accounts.pool.withdraw_destination = ctx.accounts.withdraw_destination.key();
        ctx.accounts.pool.bump = bump;

        Ok(())
    }

    pub fn withdraw_insecure(ctx: Context<WithdrawTokens>) -> Result<()> {
        let amount = ctx.accounts.vault.amount;
        let seeds = &[ctx.accounts.pool.mint.as_ref(), &[ctx.accounts.pool.bump]];
        token::transfer(ctx.accounts.transfer_ctx().with_signer(&[seeds]), amount)
    }
}


#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 32 + 32 + 1,
    )]
    pub pool: Account<'info, TokenPool>,
    pub mint: Account<'info, Mint>,
    pub vault: Account<'info, TokenAccount>,
    pub withdraw_destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    #[account(has_one = vault, has_one = withdraw_destination)]
    pool: Account<'info, TokenPool>,
    #[account(mut)]
    vault: Account<'info, TokenAccount>,
    #[account(mut)]
    withdraw_destination: Account<'info, TokenAccount>,
    /// CHECK: PDA
    authority: UncheckedAccount<'info>,
    signer: Signer<'info>,
    token_program: Program<'info, Token>,
}

impl<'info> WithdrawTokens<'info> {
    pub fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, token::Transfer<'info>> {
        let program = self.token_program.to_account_info();
        let accounts = token::Transfer {
            from: self.vault.to_account_info(),
            to: self.withdraw_destination.to_account_info(),
            authority: self.authority.to_account_info(),
        };
        CpiContext::new(program, accounts)
    }
}

#[account]
pub struct TokenPool {
    vault: Pubkey,
    mint: Pubkey,
    withdraw_destination: Pubkey,
    bump: u8,
}