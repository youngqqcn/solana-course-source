use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{PoolState, StakeInfo};

pub fn handler_unstake(ctx: Context<UnStake>) -> Result<()> {
    // TODO: 将用户质押的token释放，转给用户

    Ok(())
}

#[derive(Accounts)]
pub struct UnStake<'info> {
    /// CHECK: 控制所有 stake pool的权限
    #[account(
        seeds = [b"POOL_AUTH", stake_token_mint.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [b"STAKE_INFO", stake_token_mint.key().as_ref()],
        bump
    )]
    pub stake_info: Account<'info, StakeInfo>,

    #[account(
        mint::token_program = token_program,
    )]
    pub stake_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds=[b"REWARDS_TOKEN_SEED", stake_token_mint.key().as_ref() ],
        bump,
        mint::token_program = token_program,
        mint::authority = pool_state.pool_authority,
    )]
    pub rewards_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds=[b"POOL_STATE_SEED", stake_token_mint.key().as_ref()],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,

    #[account(
        token::mint = rewards_token_mint,
        token::authority = pool_authority,
        seeds = [b"STAKE_INFO", stake_token_mint.key().as_ref(), rewards_token_mint.key().as_ref() ],
        bump,
    )]
    pub rewards_token_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}
