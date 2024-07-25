use anchor_lang::prelude::*;

#[account]
pub struct PoolState {
    // total
    pub total_stake: u64,

    // 质押token的token mint
    pub stake_token_mint: Pubkey,
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
