use anchor_lang::prelude::*;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("4dLcUbPA87U3yNKdv6MVmjKYLJTUVQYHStFn1Hg45Wsw");

#[program]
pub mod anchor_token_2022_staking {
    use super::*;

    pub fn init_pool(ctx: Context<InitializePool>) -> Result<()> {
        msg!("Creating staking pool...");

        init_pool::handler_init_pool(ctx)
    }

    pub fn init_stake_entry(ctx: Context<InitializeStakeEntry>) -> Result<()> {
        msg!("Creating staking entry...");

        init_stake_entry::handler_init_stake_entry(ctx)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        msg!("Staking...");

        stake::handler_stake(ctx, amount)
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        msg!("Unstaking...");

        unstake::handler_unstake(ctx)
    }
}
