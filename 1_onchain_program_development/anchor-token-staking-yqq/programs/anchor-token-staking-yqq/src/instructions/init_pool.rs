use std::mem::size_of;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::PoolState;

pub fn handler_init_pool(ctx: Context<InitializePool>) -> Result<()> {
    let pool_state = &mut ctx.accounts.pool_state;

    pool_state.stake_token_mint = ctx.accounts.stake_token_mint.key();
    pool_state.total_stake = 0;

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

    // 质押token的token mint
    #[account(
        mint::authority = payer, // 仅代币发行方可以创建pool, 方便处理
        mint::token_program = token_program
    )]
    pub stake_token_mint: InterfaceAccount<'info, Mint>,

    // 接受用户质押的token
    #[account(
        init,
        payer=payer,
        seeds = [b"RECEIVE_STAKE_TOKEN_ATA_SEED", stake_token_mint.key().as_ref()],
        bump,
        token::mint=stake_token_mint,
        token::authority = pool_authority,
        token::token_program = token_program,
    )]
    pub receive_stake_token_ata: InterfaceAccount<'info, TokenAccount>,

    // 质押奖励的 token mint
    #[account(
        init,
        payer=payer,
        seeds=[b"REWARDS_TOKEN_SEED", stake_token_mint.key().as_ref() ],
        bump,
        mint::token_program = token_program,
        mint::authority = pool_authority,
        mint::decimals=0,
        mint::freeze_authority=pool_authority,
    )]
    pub rewards_token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
