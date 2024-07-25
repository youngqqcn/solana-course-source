use anchor_lang::prelude::*;




#[error_code]
pub enum StakeError {
    #[msg("invalid unstake amount")]
    InvalidUnStakeAmount,

    #[msg("pool balance is not enough for unstaking")]
    PoolBalanceNotEnough,

    #[msg("xxx")]
    InsufficientFunds,

    #[msg("token program type not match")]
    TokenProgramTypeNotMatch,
}