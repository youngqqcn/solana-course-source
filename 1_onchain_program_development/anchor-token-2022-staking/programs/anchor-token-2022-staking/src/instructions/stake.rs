use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{transfer_checked, TransferChecked},
    // token::{transfer_checked, TransferChecked}, // 注意: token2022可以向后兼容token, 而token不能兼容token2022
    token_interface
};

use crate::{errors::*, state::*, utils::check_token_program};

pub fn handler_stake(ctx: Context<Stake>, stake_amount: u64) -> Result<()> {
    check_token_program(ctx.accounts.token_program.key());

    msg!("Pool initial total: {}", ctx.accounts.pool_state.amount);
    msg!(
        "User entry initial balance: {}",
        ctx.accounts.user_stake_entry.balance
    );

    let decimals = ctx.accounts.token_mint.decimals;
    // transfer_checked from token22 program
    transfer_checked(ctx.accounts.transfer_checked_ctx(), stake_amount, decimals)?;

    let pool_state = &mut ctx.accounts.pool_state;
    let user_entry = &mut ctx.accounts.user_stake_entry;

    // update pool state amount
    pool_state.amount = pool_state.amount.checked_add(stake_amount).unwrap();
    msg!("Current pool stake total: {}", pool_state.amount);

    // update user stake entry
    user_entry.balance = user_entry.balance.checked_add(stake_amount).unwrap();
    msg!("User stake balance: {}", user_entry.balance);
    user_entry.last_staked = Clock::get().unwrap().unix_timestamp; // 获取时间戳(链上)

    Ok(())
}

#[derive(Accounts)]
pub struct Stake<'info> {
    // pool state account
    #[account(
        mut,
        seeds = [token_mint.key().as_ref(), STAKE_POOL_STATE_SEED.as_bytes()],
        bump = pool_state.bump,
    )]
    pub pool_state: Account<'info, PoolState>, // pool state 账户

    // Mint of token to stake
    #[account(
        mut,
        mint::token_program = token_program
    )]
    pub token_mint: InterfaceAccount<'info, token_interface::Mint>, // 质押token

    /// CHECK: PDA, auth over all token vaults
    #[account(
        seeds = [VAULT_AUTH_SEED.as_bytes()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>, // pool 权限, 保持和 init_pool 中一致

    // pool token account for Token Mint
    #[account(
        mut,
        // use token_mint, pool auth, and constant as seeds for token a vault
        seeds = [token_mint.key().as_ref(), pool_authority.key().as_ref(), VAULT_SEED.as_bytes()],
        bump = pool_state.vault_bump,
        token::token_program = token_program
    )]
    pub token_vault: InterfaceAccount<'info, token_interface::TokenAccount>, // 国库(质押池子)

    #[account(
        mut,
        constraint = user.key() == user_stake_entry.user // 可以用在 user_stake_entry中用 has_one
        @ StakeError::InvalidUser
    )]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = user_token_account.mint == pool_state.token_mint
        @ StakeError::InvalidMint, // 确保是同一个mint
        token::token_program = token_program   // 确保是同一个 program, token或token22
    )]
    pub user_token_account: InterfaceAccount<'info, token_interface::TokenAccount>, // 质押代币,用户ATA


    #[account(
        mut,
        seeds = [user.key().as_ref(), pool_state.token_mint.key().as_ref(), STAKE_ENTRY_SEED.as_bytes()],
        bump = user_stake_entry.bump,
        // has_one = user
    )]
    pub user_stake_entry: Account<'info, StakeEntry>, // stake状态信息， 保持和init_stake_entry一致


    pub token_program: Interface<'info, token_interface::TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Stake<'info> {
    // transfer_checked for Token2022
    pub fn transfer_checked_ctx(&self) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        let cpi_program = self.token_program.to_account_info();
        let cpi_accounts = TransferChecked {
            from: self.user_token_account.to_account_info(),
            to: self.token_vault.to_account_info(),
            authority: self.user.to_account_info(),
            mint: self.token_mint.to_account_info(),
        };

        CpiContext::new(cpi_program, cpi_accounts)
    }
}
