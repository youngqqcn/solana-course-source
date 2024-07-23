use {
    crate::{state::*, utils::check_token_program},
    anchor_lang::prelude::*,
    anchor_spl::token_interface,
    std::mem::size_of,
};
// use crate::state::*;

pub fn handler_init_pool(ctx: Context<InitializePool>) -> Result<()> {
    check_token_program(ctx.accounts.token_program.key());

    // initialize pool state
    let pool_state = &mut ctx.accounts.pool_state;
    pool_state.bump = ctx.bumps.pool_state;
    pool_state.amount = 0;
    pool_state.vault_bump = ctx.bumps.token_vault;
    pool_state.vault_auth_bump = ctx.bumps.pool_authority;
    pool_state.token_mint = ctx.accounts.token_mint.key();
    pool_state.staking_token_mint = ctx.accounts.staking_token_mint.key();
    pool_state.vault_authority = ctx.accounts.pool_authority.key();

    msg!("Staking pool created!");

    Ok(())
}
// #[derive(Accounts)]
// pub struct InitializePool<'info> {
//     pub token_program: Interface<'info, token_interface::TokenInterface>,
// }

#[derive(Accounts)]
pub struct InitializePool<'info> {
    /// CHECK: PDA, auth over all token vaults
    #[account(
        seeds = [VAULT_AUTH_SEED.as_bytes()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,
    // pool state account
    #[account(
        init,
        seeds = [token_mint.key().as_ref(), STAKE_POOL_STATE_SEED.as_bytes()],
        bump,
        payer = payer,
        space = 8 + size_of::<PoolState>()
    )]
    pub pool_state: Account<'info, PoolState>,
    // Mint of token
    #[account(
        mint::token_program = token_program,
        mint::authority = payer
    )]
    pub token_mint: InterfaceAccount<'info, token_interface::Mint>,
    // pool token account for Token Mint
    #[account(
        init,
        token::mint = token_mint,
        token::authority = pool_authority,
        token::token_program = token_program,
        // use token_mint, pool auth, and constant as seeds for token a vault
        seeds = [token_mint.key().as_ref(), pool_authority.key().as_ref(), VAULT_SEED.as_bytes()],
        bump,
        payer = payer,
    )]
    pub token_vault: InterfaceAccount<'info, token_interface::TokenAccount>,
    // Mint of staking token
    #[account(
        mut,
        mint::token_program = token_program
    )]
    pub staking_token_mint: InterfaceAccount<'info, token_interface::Mint>,
    // payer, will pay for creation of pool vault
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Interface<'info, token_interface::TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
