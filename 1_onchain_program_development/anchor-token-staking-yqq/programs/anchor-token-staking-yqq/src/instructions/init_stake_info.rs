use std::mem::size_of;

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{state::*, PoolState, StakeInfo};

pub fn handler_init_stake_info(ctx: Context<InitializeStakeInfo>) -> Result<()> {
    let stake_info = &mut ctx.accounts.stake_info;

    stake_info.user = ctx.accounts.payer.key();
    stake_info.pool_state = ctx.accounts.pool_state.key();
    stake_info.stake_amount = 0;
    stake_info.latest_stake_ts = 0;
    stake_info.stake_token_mint = ctx.accounts.stake_token_mint.key();

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeStakeInfo<'info> {
    /// CHECK: 控制所有 stake pool的权限
    #[account(
        seeds = [POOL_AUTH_SEED.as_bytes(), stake_token_mint.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer=payer,
        space= 8 +  size_of::<StakeInfo>(),
        seeds = [STAKE_INFO.as_bytes(), stake_token_mint.key().as_ref(), payer.key().as_ref()],
        bump
    )]
    pub stake_info: Account<'info, StakeInfo>,

    #[account(
        mint::token_program = token_program,
    )]
    pub stake_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds=[REWARDS_TOKEN_SEED.as_bytes(), stake_token_mint.key().as_ref() ],
        bump,
    )]
    pub rewards_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds=[POOL_STATE_SEED.as_bytes(), stake_token_mint.key().as_ref()],
        bump,
        has_one = stake_token_mint,
    )]
    pub pool_state: Account<'info, PoolState>,

    #[account(
        init,
        payer=payer,
        token::mint = rewards_token_mint,
        token::authority = payer, // 所有权交给用户
        seeds = [USER_REWARDS_ATA_SEED.as_bytes(), stake_token_mint.key().as_ref(),  payer.key().as_ref() ],
        bump,
    )]
    pub user_rewards_token_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}
