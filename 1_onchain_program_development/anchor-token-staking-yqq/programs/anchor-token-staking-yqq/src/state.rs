use anchor_lang::prelude::*;

#[account]
pub struct PoolState {
    /// 控制所有 stake pool的权限
    pub pool_authority: Pubkey,

    // pool_authority的bump
    pub auth_bump: u8,

    // total 
    pub total_stake: u64,

    // 质押token的token mint
    pub stake_token_mint: Pubkey,

    // 质押奖励的 token mint
    pub rewards_token_mint: Pubkey,
}

#[account]
pub struct StakeInfo {
    // 所属用户
    pub user: Pubkey,

    // bump
    pub bump: u8,

    pub pool_state: Pubkey,

    // 质押金额
    pub stake_amount: u64,

    // 质押时间
    pub latest_stake_ts: u64,

    // 质押token的token mint
    pub stake_token_mint: Pubkey,

    // 质押奖励的 token mint
    pub rewards_token_mint: Pubkey,

    // 接收质押奖励的 ata
    pub rewards_token_ata: Pubkey,
}
