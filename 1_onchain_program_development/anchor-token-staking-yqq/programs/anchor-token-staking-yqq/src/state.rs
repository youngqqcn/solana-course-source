use anchor_lang::prelude::*;


#[account]
pub struct PoolState {
    /// 控制所有 stake pool的权限
    pub pool_authority: Pubkey,

    // pool_authority的bump
    pub auth_bump: u8,

    // 质押token的token mint
    pub stake_token_mint: Pubkey,

    // 质押奖励的 token mint
    pub rewards_token_mint: Pubkey,
}
