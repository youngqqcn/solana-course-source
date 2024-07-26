use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("CebQMir8nc7G4h3W6h6XL8YHGL76zffqgF6ZsWJciyRa");

#[program]
pub mod anchor_token_staking_yqq {

    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        init_pool::handler_init_pool(ctx)
    }

    pub fn initialize_stake_info(ctx: Context<InitializeStakeInfo>) -> Result<()> {
        init_stake_info::handler_init_stake_info(ctx)
    }

    pub fn stake(ctx: Context<Stake>, stake_amount: u64) -> Result<()> {
        stake::handler_stake(ctx, stake_amount)
    }

    pub fn unstake(ctx: Context<UnStake>, unstake_amount: u64) -> Result<()> {
        unstake::handler_unstake(ctx, unstake_amount)
    }

    pub fn update_stake_ratio(ctx: Context<UpdateStakeRatio>, new_stake_ratio: u16) -> Result<()> {
        update_stake_ratio::handler_update_stake_ratio(ctx, new_stake_ratio)
    }
}
