use anchor_lang::prelude::*;

declare_id!("Hm5ATvxsAvrrrUrgof6dyCLP3V4NQkATpCfQpmQzXjCk");

#[program]
pub mod anchor_counter_plus {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
