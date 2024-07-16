use anchor_lang::prelude::*;
mod instructions;
use instructions::*;

pub mod state;

declare_id!("CXhnPGDqgbUb2LXyN3ttRB9XiySRrUSHvTZaaYYHDhM1");

// FIXME: 修改
#[cfg(feature = "local-testing")]
#[constant]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("env9JiVQgUQMLt7Qekm8VEwyp2Wzds7ht7UpcmmiR1V");

#[cfg(not(feature = "local-testing"))]
#[constant]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

pub const SEED_PROGRAM_CONFIG: &[u8] = b"program_config";

// #[constant]
// pub const ADMIN: Pubkey = pubkey!("7DxeAgFoxk9Ha3sdciWE4G4hsR9CUjPxsHAxTmuCJrop");

#[program]
pub mod anchor_admin_instruction {
    use super::*;

    pub fn initialize_program_config(ctx: Context<InitializeProgramConfig>) -> Result<()> {
        instructions::initialize_program_config_handler(ctx)
    }

    pub fn update_program_config(ctx: Context<UpdateProgramConfig>, new_fee: u64) -> Result<()> {
        instructions::update_program_config_handler(ctx, new_fee)
    }

    pub fn payment(ctx: Context<Payment>, amount: u64) -> Result<()> {
        instructions::payment_handler(ctx, amount)
    }
}
