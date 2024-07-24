use std::mem::size_of;

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface};

use crate::{errors::StakeError, state::*, utils::check_token_program};

pub fn handler_init_stake_entry(ctx: Context<InitializeStakeEntry>) -> Result<()> {
    check_token_program(ctx.accounts.token_program.key());

    // initialize user stake entry state
    let user_entry = &mut ctx.accounts.user_stake_entry;
    user_entry.user = ctx.accounts.user.key();
    user_entry.user_stake_token_account = ctx.accounts.user_stake_token_account.key();
    user_entry.bump = ctx.bumps.user_stake_entry;
    user_entry.balance = 0;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeStakeEntry<'info> {
    // The user that is creating the stake_entry account.
    // This account must sign the transaction and will need to pay for
    // the rent required to create the stake_entry account.
    #[account(mut)]
    pub user: Signer<'info>,

    // State account that will be created at a PDA derived from the user,
    // mint the staking pool was created for, and the STAKE_ENTRY_SEED as seeds.
    #[account(
        init,
        seeds = [user.key().as_ref(), pool_state.token_mint.key().as_ref(), STAKE_ENTRY_SEED.as_bytes()],
        bump,
        payer = user,
        space = 8 + size_of::<StakeEntry>()
    )]
    pub user_stake_entry: Account<'info, StakeEntry>, // state 账户


    // User's associated token account(ATA) for the staking reward token.
    #[account(
        init,
        associated_token::mint = staking_token_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
        payer = user,
    )]
    pub user_stake_token_account: InterfaceAccount<'info, token_interface::TokenAccount>, // 质押奖励代币的ATA

    // Mint of the staking reward token of this pool.
    #[account(
        constraint = staking_token_mint.key() == pool_state.staking_token_mint
        @ StakeError::InvalidStakingTokenMint,
        mint::token_program = token_program
    )]
    pub staking_token_mint: InterfaceAccount<'info, token_interface::Mint>, // 质押奖励代币的Mint

    // PoolState account for this staking pool.
    #[account(
        seeds = [pool_state.token_mint.key().as_ref(), STAKE_POOL_STATE_SEED.as_bytes()],
        bump = pool_state.bump
    )]
    pub pool_state: Account<'info, PoolState>, // pool state

    // token program , compacity with Token and Token Extension(Token 2022)
    pub token_program: Interface<'info, token_interface::TokenInterface>, // 兼容 token 和 token22

    // as user_stake_token_account derived as an ATA account
    pub associated_token_program: Program<'info, AssociatedToken>, // 因为 user_stake_token_account 使用的ATA, 因此需要关联 ATA Program

    pub system_program: Program<'info, System>,
}
