use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{transfer_checked, TransferChecked}, // 必须用 token_2022, 否则会报错
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{PoolState, StakeError, StakeInfo};

pub fn handler_stake(ctx: Context<Stake>, stake_amount: u64) -> Result<()> {
    msg!("handler_stake");
    // TODO: 转移 stake token
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.user_stake_token_ata.to_account_info(),
            mint: ctx.accounts.stake_token_mint.to_account_info(),
            to: ctx.accounts.receive_stake_token_ata.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        },
    );
    transfer_checked(
        cpi_ctx,
        stake_amount,
        ctx.accounts.stake_token_mint.decimals,
    )?;

    let stake_info = &mut ctx.accounts.stake_info;
    let pool_state = &mut ctx.accounts.pool_state;

    stake_info.stake_amount = stake_amount;
    msg!(
        "stake info : {}, stake amount: {}",
        stake_info.key(),
        stake_info.stake_amount
    );

    // 增加总余额
    pool_state.total_stake = pool_state.total_stake.checked_add(stake_amount).unwrap();
    msg!("pool total stake: {}", pool_state.total_stake);

    Ok(())
}

#[derive(Accounts)]
pub struct Stake<'info> {
    /// CHECK: 控制所有 stake pool的权限
    #[account(
        seeds = [b"POOL_AUTH", stake_token_mint.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"STAKE_INFO", stake_token_mint.key().as_ref(), payer.key().as_ref()],
        bump,
        // 比对stake_info 是否和payer是否匹配, 黑客
        constraint= (payer.key() == stake_info.user.key()) @ StakeError::StakeAccountNotMatch,
    )]
    pub stake_info: Account<'info, StakeInfo>,

    #[account(
        mint::token_program = token_program,
    )]
    pub stake_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds=[b"POOL_STATE_SEED", stake_token_mint.key().as_ref()],
        bump,
        has_one = stake_token_mint,
    )]
    pub pool_state: Account<'info, PoolState>,

    // 用户的 stake token ATA
    #[account(
        mut,
        associated_token::mint=stake_token_mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program,
    )]
    pub user_stake_token_ata: InterfaceAccount<'info, TokenAccount>,

    // 接受用户质押的token
    #[account(
        mut,
        token::mint=stake_token_mint,
        token::authority = pool_authority,
        token::token_program = token_program,
        seeds = [b"RECEIVE_STAKE_TOKEN_ATA_SEED", stake_token_mint.key().as_ref()],
        bump,
    )]
    pub receive_stake_token_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,

    // pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
