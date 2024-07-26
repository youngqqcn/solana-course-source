use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{state::*, PoolState, StakeError};

pub fn handler_update_stake_ratio(ctx: Context<UpdateStakeRatio>, new_ratio: u16) -> Result<()> {
    let pool_state = &mut ctx.accounts.pool_state;

    pool_state.rewards_ratio = new_ratio;
    Ok(())
}

#[derive(Accounts)]
#[instruction(new_ratio: u16)]
pub struct UpdateStakeRatio<'info> {
    #[account(
        mut,
        // seeds=[POOL_STATE_SEED.as_bytes(), pool_state.stake_token_mint.key().as_ref()],
        seeds=[POOL_STATE_SEED.as_bytes(), stake_token_mint.key().as_ref()],
        bump,
        constraint =  new_ratio > 0 && new_ratio < 0xffff @ StakeError::InvalidStakeRatio,
        has_one = stake_token_mint,
        has_one = admin,
        // constraint = admin.key() == pool_state.admin @ StakeError::Unauthorized,
    )]
    pub pool_state: Account<'info, PoolState>,
    pub stake_token_mint: InterfaceAccount<'info, Mint>,
    pub admin: Signer<'info>,
}
