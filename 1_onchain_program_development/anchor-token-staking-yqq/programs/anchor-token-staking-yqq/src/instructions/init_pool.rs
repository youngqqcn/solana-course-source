use std::mem::size_of;

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::PoolState;

pub fn handler_init_pool(ctx: Context<InitializePool>) -> Result<()> {
    let pool_state = &mut ctx.accounts.pool_state;

    pool_state.pool_authority = ctx.accounts.pool_authority.key();
    pool_state.auth_bump = ctx.bumps.pool_state;
    pool_state.stake_token_mint = ctx.accounts.stake_token_mint.key();
    pool_state.rewards_token_mint = ctx.accounts.rewards_token_mint.key();

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    /// CHECK: 控制所有 stake pool的权限
    #[account(
        init,
        payer=payer,
        space= 8 + size_of::<UncheckedAccount>(),
        seeds = [b"POOL_AUTH", stake_token_mint.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    // pool_state 账户
    #[account(
        init,
        payer=payer,
        space= 8 + size_of::<PoolState>(),
        seeds=[b"POOL_STATE_SEED", stake_token_mint.key().as_ref()],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,

    // TODO: 增加更多约束
    // 质押token的token mint
    #[account()]
    pub stake_token_mint: InterfaceAccount<'info, Mint>,

    // TODO:
    // 质押奖励的 token mint
    #[account(
        init,
        payer=payer,
        // space= 8 + size_of::<Mint>(),
        seeds=[b"REWARDS_TOKEN_SEED", stake_token_mint.key().as_ref() ],
        bump,
        token::token_program = stake_token_mint.program,
        mint::authority = pool_authority,
        mint::decimals=0,
    )]
    pub rewards_token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
