
use anchor_lang::prelude::*;

pub const DEFAULT_REWARDS_RATIO: u16 = 10000;
pub const POOL_AUTH_SEED: &str = "POOL_AUTH";
pub const POOL_STATE_SEED: &str = "POOL_STATE_SEED";
pub const RECEIVE_STAKE_TOKEN_ATA_SEED: &str = "RECEIVE_STAKE_TOKEN_ATA_SEED";
pub const REWARDS_TOKEN_SEED: &str = "REWARDS_TOKEN_SEED";
pub const STAKE_INFO: &str = "STAKE_INFO";
pub const USER_REWARDS_ATA_SEED: &str = "USER_REWARDS_ATA_SEED";

#[account]
pub struct PoolState {
    // total
    pub total_stake: u64,

    // 质押token的token mint
    pub stake_token_mint: Pubkey,

    // 质押利率
    pub rewards_ratio: u16,

    pub admin: Pubkey,
}

#[account]
pub struct StakeInfo {
    // 所属用户
    pub user: Pubkey,

    pub pool_state: Pubkey,

    // 质押金额
    pub stake_amount: u64,

    // 质押时间
    pub latest_stake_ts: u64,

    // 质押token的token mint
    pub stake_token_mint: Pubkey,
}
