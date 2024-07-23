use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{mint_to, transfer_checked, MintTo, TransferChecked},
    token_interface,
};

use crate::{errors::*, state::*, utils::check_token_program};

pub fn handler_unstake(ctx: Context<Unstake>) -> Result<()> {
    check_token_program(ctx.accounts.token_program.key());

    let user_entry = &ctx.accounts.user_stake_entry;
    let amount = user_entry.balance;
    let decimals = ctx.accounts.token_mint.decimals;

    msg!("User stake balance: {}", user_entry.balance);
    msg!(
        "Withdrawing all of users stake balance. Tokens to withdraw: {}",
        amount
    );
    msg!(
        "Total staked before withdrawal: {}",
        ctx.accounts.pool_state.amount
    );

    // verify user and pool have >= requested amount of tokens staked
    if amount > ctx.accounts.pool_state.amount {
        return Err(StakeError::OverdrawError.into());
    }

    // program signer seeds
    let auth_bump = ctx.accounts.pool_state.vault_auth_bump;
    let auth_seeds = &[VAULT_AUTH_SEED.as_bytes(), &[auth_bump]];
    let signer = &[&auth_seeds[..]];

    // transfer staked tokens
    transfer_checked(ctx.accounts.transfer_checked_ctx(signer), amount, decimals)?;

    // mint users staking rewards, 10x amount of staked tokens
    let stake_rewards = amount.checked_mul(10).unwrap();

    // mint rewards to user
    mint_to(ctx.accounts.mint_to_ctx(signer), stake_rewards)?;

    // borrow mutable references
    let pool_state = &mut ctx.accounts.pool_state;
    let user_entry = &mut ctx.accounts.user_stake_entry;

    // subtract transferred amount from pool total
    pool_state.amount = pool_state.amount.checked_sub(amount).unwrap();
    msg!("Total staked after withdrawal: {}", pool_state.amount);

    // update user stake entry
    user_entry.balance = user_entry.balance.checked_sub(amount).unwrap();
    user_entry.last_staked = Clock::get().unwrap().unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    // pool state account
    #[account(
        mut,
        seeds = [token_mint.key().as_ref(), STAKE_POOL_STATE_SEED.as_bytes()],
        bump = pool_state.bump,
    )]
    pub pool_state: Account<'info, PoolState>,
    // Mint of token
    #[account(
        mut,
        mint::token_program = token_program
    )]
    pub token_mint: InterfaceAccount<'info, token_interface::Mint>,
    /// CHECK: PDA, auth over all token vaults
    #[account(
        seeds = [VAULT_AUTH_SEED.as_bytes()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,
    // pool token account for Token Mint
    #[account(
        mut,
        // use token_mint, pool auth, and constant as seeds for token a vault
        seeds = [token_mint.key().as_ref(), pool_authority.key().as_ref(), VAULT_SEED.as_bytes()],
        bump = pool_state.vault_bump,
        token::token_program = token_program
    )]
    pub token_vault: InterfaceAccount<'info, token_interface::TokenAccount>,
    // require a signature because only the user should be able to unstake their tokens
    #[account(
        mut,
        constraint = user.key() == user_stake_entry.user
        @ StakeError::InvalidUser
    )]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.mint == pool_state.token_mint
        @ StakeError::InvalidMint,
        token::token_program = token_program
    )]
    pub user_token_account: InterfaceAccount<'info, token_interface::TokenAccount>,
    #[account(
        mut,
        seeds = [user.key().as_ref(), pool_state.token_mint.key().as_ref(), STAKE_ENTRY_SEED.as_bytes()],
        bump = user_stake_entry.bump,

    )]
    pub user_stake_entry: Account<'info, StakeEntry>,
    // Mint of staking token
    #[account(
        mut,
        mint::authority = pool_authority,
        mint::token_program = token_program,
        constraint = staking_token_mint.key() == pool_state.staking_token_mint
        @ StakeError::InvalidStakingTokenMint
    )]
    pub staking_token_mint: InterfaceAccount<'info, token_interface::Mint>,
    #[account(
        mut,
        token::mint = staking_token_mint,
        token::authority = user,
        token::token_program = token_program,
        constraint = user_stake_token_account.key() == user_stake_entry.user_stake_token_account
        @ StakeError::InvalidUserStakeTokenAccount
    )]
    pub user_stake_token_account: InterfaceAccount<'info, token_interface::TokenAccount>,
    pub token_program: Interface<'info, token_interface::TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Unstake<'info> {
    // transfer_checked for Token2022
    pub fn transfer_checked_ctx<'a>(
        &'a self,
        seeds: &'a [&[&[u8]]],
    ) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.token_vault.to_account_info(),
            to: self.user_token_account.to_account_info(),
            authority: self.pool_authority.to_account_info(),
            mint: self.token_mint.to_account_info(),
        };

        CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds)
    }

    // mint_to
    pub fn mint_to_ctx<'a>(
        &'a self,
        seeds: &'a [&[&[u8]]],
    ) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = MintTo {
            mint: self.staking_token_mint.to_account_info(),
            to: self.user_stake_token_account.to_account_info(),
            authority: self.pool_authority.to_account_info(),
        };

        CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds)
    }
}
