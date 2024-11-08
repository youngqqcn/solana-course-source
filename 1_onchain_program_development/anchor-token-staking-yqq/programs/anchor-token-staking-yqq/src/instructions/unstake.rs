use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{mint_to, transfer_checked, MintTo, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{state::*, PoolState, StakeError, StakeInfo};

pub fn handler_unstake(ctx: Context<UnStake>, unstake_amount: u64) -> Result<()> {
    msg!("handler_unstake");
    // 先更新状态，然后再执行操作
    let stake_amount = ctx.accounts.stake_info.stake_amount;
    msg!("stake info : {}", ctx.accounts.stake_info.key());
    msg!("stake_amount: {}", stake_amount);
    let pool_state = &mut ctx.accounts.pool_state;
    let stake_info = &mut ctx.accounts.stake_info;

    pool_state.total_stake = pool_state.total_stake.checked_sub(unstake_amount).unwrap();
    stake_info.stake_amount = stake_info.stake_amount.checked_sub(unstake_amount).unwrap();
    stake_info.latest_stake_ts = Clock::get().unwrap().unix_timestamp as u64;
    msg!("pool total stake: {}", pool_state.total_stake);
    msg!("stake amount: {}", stake_info.stake_amount);

    // TODO: 将用户质押的token释放，转给用户
    let stake_token_mint_pubkey = ctx.accounts.stake_token_mint.key(); // 接住临时变量
                                                                       // 这里加上类型声明，不然编译器推导的有问题
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"POOL_AUTH",
        stake_token_mint_pubkey.as_ref(),
        &[ctx.bumps.pool_authority],
    ]];

    transfer_checked(
        ctx.accounts.transfer_checked_ctx(signer_seeds),
        unstake_amount,
        ctx.accounts.stake_token_mint.decimals,
    )?;

    msg!("stake_token_mint: {}", ctx.accounts.stake_token_mint.key());
    msg!(
        "rewards_token_mint: {}",
        ctx.accounts.rewards_token_mint.key()
    );
    msg!(
        "rewards_token_ata: {}",
        ctx.accounts.user_rewards_token_ata.key()
    );

    // 发放奖励代币
    let rewards_ratio: u64 = ctx.accounts.pool_state.rewards_ratio as u64;
    let rewards_amount = unstake_amount
        .checked_mul(rewards_ratio)
        .unwrap()
        .checked_div(100)
        .unwrap();
    mint_to(ctx.accounts.mint_to_ctx(signer_seeds), rewards_amount)?;

    msg!(
        "mint {} rewards to {} success",
        rewards_amount,
        ctx.accounts.user_rewards_token_ata.key()
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(unstake_amount: u64)]
pub struct UnStake<'info> {
    /// CHECK: 控制所有 stake pool的权限
    #[account(
        seeds = [POOL_AUTH_SEED.as_bytes(), stake_token_mint.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [STAKE_INFO.as_bytes(), stake_token_mint.key().as_ref(), payer.key().as_ref()],
        bump,
        // 判断余额是否足够
        constraint = stake_info.stake_amount >= unstake_amount @  StakeError::InvalidUnStakeAmount,
    )]
    pub stake_info: Account<'info, StakeInfo>,

    #[account(
        mint::token_program = token_program,
    )]
    pub stake_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds=[REWARDS_TOKEN_SEED.as_bytes(), stake_token_mint.key().as_ref() ],
        bump,
        mint::token_program = token_program,
        mint::authority = pool_authority,
    )]
    pub rewards_token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds=[POOL_STATE_SEED.as_bytes(), stake_token_mint.key().as_ref()],
        bump,
        constraint = pool_state.total_stake >= unstake_amount @  StakeError::PoolBalanceNotEnough
    )]
    pub pool_state: Account<'info, PoolState>,

    // 用户接受质押奖励的 ATA
    #[account(
        mut,
        token::mint = rewards_token_mint,
        token::authority = payer,
        seeds = [USER_REWARDS_ATA_SEED.as_bytes(), stake_token_mint.key().as_ref(),  payer.key().as_ref() ],
        bump,
    )]
    pub user_rewards_token_ata: InterfaceAccount<'info, TokenAccount>,

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
        seeds = [RECEIVE_STAKE_TOKEN_ATA_SEED.as_bytes(), stake_token_mint.key().as_ref()],
        bump,
    )]
    pub receive_stake_token_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

impl<'info> UnStake<'info> {
    pub fn transfer_checked_ctx<'a>(
        &'a self,
        seeds: &'a [&[&[u8]]],
    ) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            TransferChecked {
                from: self.receive_stake_token_ata.to_account_info(),
                mint: self.stake_token_mint.to_account_info(),
                to: self.user_stake_token_ata.to_account_info(),
                authority: self.pool_authority.to_account_info(),
            },
            seeds,
        )
    }

    pub fn mint_to_ctx<'a>(
        &'a self,
        seeds: &'a [&[&[u8]]],
    ) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.rewards_token_mint.to_account_info(),
                to: self.user_rewards_token_ata.to_account_info(),
                authority: self.pool_authority.to_account_info(),
            },
            seeds,
        )
    }
}
