use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{mint_to, transfer_checked, MintTo, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{PoolState, StakeInfo};

pub fn handler_unstake(ctx: Context<UnStake>) -> Result<()> {
    // TODO: 将用户质押的token释放，转给用户
    let k = ctx.accounts.stake_token_mint.key().clone();
    let seeds = &[b"POOL_AUTH", k.as_ref(), &[ctx.bumps.pool_authority]];
    let signer_seeds = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.receive_stake_token_ata.to_account_info(),
            mint: ctx.accounts.stake_token_mint.to_account_info(),
            to: ctx.accounts.user_stake_token_ata.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(),
        },
        signer_seeds,
    );

    let stake_amount = ctx.accounts.stake_info.stake_amount;
    msg!("stake info : {}", ctx.accounts.stake_info.key());
    msg!("stake_amount: {}", stake_amount);
    transfer_checked(
        cpi_ctx,
        stake_amount,
        ctx.accounts.stake_token_mint.decimals,
    )?;


    msg!("stake_token_mint: {}", ctx.accounts.stake_token_mint.key());
    msg!("rewards_token_mint: {}", ctx.accounts.rewards_token_mint.key());
    msg!("rewards_token_ata: {}", ctx.accounts.rewards_token_ata.key());

    // 发放奖励代币
    let rewards_cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.rewards_token_mint.to_account_info(),
            to: ctx.accounts.rewards_token_ata.to_account_info(),
            authority: ctx.accounts.pool_authority.to_account_info(),
        },
        signer_seeds,
    );

    let rewards_amount = stake_amount.checked_mul(100).unwrap();
    mint_to(rewards_cpi_ctx, rewards_amount)?;

    msg!(
        "mint {} rewards to {} success",
        rewards_amount,
        ctx.accounts.rewards_token_ata.key()
    );

    // 更新状态
    let pool_state = &mut ctx.accounts.pool_state;
    let stake_info = &mut ctx.accounts.stake_info;

    pool_state.total_stake = pool_state.total_stake.checked_sub(stake_amount).unwrap();
    stake_info.stake_amount = stake_info.stake_amount.checked_sub(stake_amount).unwrap();
    stake_info.latest_stake_ts = Clock::get().unwrap().unix_timestamp as u64;
    msg!("pool total stake: {}", pool_state.total_stake);
    msg!("stake amount: {}", stake_info.stake_amount);

    Ok(())
}

#[derive(Accounts)]
pub struct UnStake<'info> {
    /// CHECK: 控制所有 stake pool的权限
    #[account(
        seeds = [b"POOL_AUTH", stake_token_mint.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"STAKE_INFO", stake_token_mint.key().as_ref()],
        bump
    )]
    pub stake_info: Account<'info, StakeInfo>,

    #[account(
        mint::token_program = token_program,
    )]
    pub stake_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds=[b"REWARDS_TOKEN_SEED", stake_token_mint.key().as_ref() ],
        bump,
        mint::token_program = token_program,
        mint::authority = pool_state.pool_authority,
    )]
    pub rewards_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds=[b"POOL_STATE_SEED", stake_token_mint.key().as_ref()],
        bump,
    )]
    pub pool_state: Account<'info, PoolState>,

    // 用户接受质押奖励的 ATA
    #[account(
        mut,
        token::mint = rewards_token_mint,
        token::authority = pool_authority,
        seeds = [b"STAKE_INFO", stake_token_mint.key().as_ref(), rewards_token_mint.key().as_ref() ],
        bump,
    )]
    pub rewards_token_ata: InterfaceAccount<'info, TokenAccount>,

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

    pub system_program: Program<'info, System>,
}
