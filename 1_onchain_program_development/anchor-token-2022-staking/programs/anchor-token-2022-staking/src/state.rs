use anchor_lang::prelude::*;

pub const STAKE_POOL_STATE_SEED: &str = "state";
pub const VAULT_SEED: &str = "vault";
pub const VAULT_AUTH_SEED: &str = "vault_authority";
pub const STAKE_ENTRY_SEED: &str = "stake_entry";


// 存储pool的状态的账户
#[account]
pub struct PoolState {
    pub bump: u8,
    pub amount: u64,
    pub token_mint: Pubkey,
    pub staking_token_mint: Pubkey,
    pub staking_token_mint_bump: u8,
    pub vault_bump: u8,
    pub vault_auth_bump: u8,
    pub vault_authority: Pubkey,
}

// 保存每个用户stake的相关信息
#[account]
pub struct StakeEntry {
    pub user: Pubkey,
    pub user_stake_token_account: Pubkey,
    pub bump: u8,
    pub balance: u64,
    pub last_staked: i64,
}
