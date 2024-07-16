use crate::USDC_MINT_PUBKEY;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

#[derive(Accounts)]
pub struct Payment<'info> {
    #[account(
        mut,
        token::mint = USDC_MINT_PUBKEY
    )]
    pub fee_destination: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = USDC_MINT_PUBKEY
    )]
    pub sender_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = USDC_MINT_PUBKEY
    )]
    pub receiver_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub sender: Signer<'info>,
}

pub fn payment_handler(ctx: Context<Payment>, amount: u64) -> Result<()> {
    let fee_amount = amount.checked_mul(100).unwrap().checked_div(10000).unwrap();
    let remaining_amount = amount.checked_sub(fee_amount).unwrap();

    msg!("Amount: {}", amount);
    msg!("Fee Amount: {}", fee_amount);
    msg!("Remaining Transfer Amount: {}", remaining_amount);

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
                to: ctx.accounts.fee_destination.to_account_info(),
            },
        ),
        fee_amount,
    )?;

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
                to: ctx.accounts.receiver_token_account.to_account_info(),
            },
        ),
        remaining_amount,
    )?;

    Ok(())
}
