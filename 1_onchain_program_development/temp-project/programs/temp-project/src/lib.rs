use anchor_lang::prelude::*;

declare_id!("FLHpyf5NHpEE5yzCmc9YzER1kYJjE4o1jArhwzEvr4KN");

#[program]
pub mod temp_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
