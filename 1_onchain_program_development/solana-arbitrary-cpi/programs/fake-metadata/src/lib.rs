use anchor_lang::prelude::*;

declare_id!("6X2ux4xHAHh4LMTU5qECK9DiXHJ7FKvcpAUjuXLdjQVq");

#[program]
pub mod fake_metadata {
    use super::*;

    pub fn create_metadata(ctx: Context<CreateMetadata>) -> Result<()> {
        let metadata = &mut ctx.accounts.metadata;

        metadata.health = u8::MAX;
        metadata.power = u8::MAX;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    /// CHECK: manual checks
    pub character: AccountInfo<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8,
        seeds = [character.key().as_ref()],
        bump
    )]
    pub metadata: Account<'info, Metadata>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Metadata {
    pub character: Pubkey,
    pub health: u8,
    pub power: u8,
}