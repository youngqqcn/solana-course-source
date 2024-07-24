use anchor_lang::prelude::*;

declare_id!("CebQMir8nc7G4h3W6h6XL8YHGL76zffqgF6ZsWJciyRa");

#[program]
pub mod anchor_token_staking_yqq {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
