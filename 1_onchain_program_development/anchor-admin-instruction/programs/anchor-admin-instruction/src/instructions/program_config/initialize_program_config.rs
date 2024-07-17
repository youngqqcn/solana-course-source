use crate::program::AnchorAdminInstruction; // 对应 libs 中的  anchor_admin_instruction, 这里是驼峰命名
use crate::{state::ProgramConfig, SEED_PROGRAM_CONFIG, USDC_MINT_PUBKEY};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct InitializeProgramConfig<'info> {
    #[account(
        init,
        payer=authority,
        space=ProgramConfig::LEN,
        seeds=[SEED_PROGRAM_CONFIG],
        bump
    )]
    pub program_config: Account<'info, ProgramConfig>,
    #[account(token::mint = USDC_MINT_PUBKEY)]
    pub fee_destination: Account<'info, TokenAccount>,

    // 增加升级
    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, AnchorAdminInstruction>,
    // 指定升级权限
    #[account(constraint = program_data.upgrade_authority_address == Some(authority.key()))]
    pub program_data: Account<'info, ProgramData>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_program_config_handler(ctx: Context<InitializeProgramConfig>) -> Result<()> {
    ctx.accounts.program_config.admin = ctx.accounts.authority.key();
    ctx.accounts.program_config.fee_destination = ctx.accounts.fee_destination.key();
    ctx.accounts.program_config.fee_basis_points = 100; // 1%

    Ok(())
}
