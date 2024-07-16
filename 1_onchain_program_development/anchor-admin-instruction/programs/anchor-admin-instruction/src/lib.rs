use anchor_lang::prelude::*;
mod instructions;
use instructions::*;

declare_id!("CXhnPGDqgbUb2LXyN3ttRB9XiySRrUSHvTZaaYYHDhM1");

// FIXME: 修改
#[cfg(feature = "local-testing")]
#[constant]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("env9JiVQgUQMLt7Qekm8VEwyp2Wzds7ht7UpcmmiR1V");

#[cfg(not(feature = "local-testing"))]
#[constant]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

#[program]
pub mod anchor_admin_instruction {
    use super::*;

    pub fn payment(ctx: Context<Payment>, amount: u64) -> Result<()> {
        instructions::payment_handler(ctx, amount)
    }
}
