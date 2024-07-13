use anchor_lang::prelude::*;

declare_id!("9eyVUWKL7jXk5YH1pY8VyJPfXR5vDd9vksaKcxFpX4xt");

#[program]
pub mod anchor_student_intro_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
