use {
    crate::{state::*, utils::check_token_program},
    anchor_lang::prelude::*,
    anchor_spl::token_interface,
    std::mem::size_of,
};

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

#[derive(Accounts)]
pub struct InitializePool<'info> {
    /// CHECK: PDA, auth over all token vaults
    #[account(
        seeds = [VAULT_AUTH_SEED.as_bytes()],
        bump
    )]
    //  PDA that is the authority over all staking pools.
    //  This will be a PDA derived with a specific seed.
    pub pool_authority: UncheckedAccount<'info>, // 不保存状态，不需要反序列化,因此用 UncheckedAccount 或 AccountInfo

    // pool state account
    // State account created in this instruction at a PDA.
    // This account will hold state regarding this specific staking pool like
    // the amount of tokens staked, how many users have staked, etc.
    #[account(
        init,
        seeds = [token_mint.key().as_ref(), STAKE_POOL_STATE_SEED.as_bytes()],
        bump,
        payer = payer,
        space = 8 + size_of::<PoolState>()
    )]
    pub pool_state: Account<'info, PoolState>, // state 账户

    // Mint of token
    // The mint of tokens expected to be staked in this staking pool.
    // There will be a unique staking pool for each token.
    #[account(
        mint::token_program = token_program,
        mint::authority = payer // 必须是token mint 的authoriy才可以创建stake pool
    )]
    pub token_mint: InterfaceAccount<'info, token_interface::Mint>, // 用户质押的token mint,  兼容 token 和 token2022

    // pool token account for Token Mint
    // Token account of the same mint as token_mint at a PDA.
    // This is a token account with the pool_authority PDA as the authority.
    // This gives the program control over the token account.
    // All tokens staked in this pool will be held in this token account.
    #[account(
        init,
        token::mint = token_mint,
        token::authority = pool_authority, // 将Token Account的owner设置为 pool_authority
        token::token_program = token_program,
        // use token_mint, pool auth, and constant as seeds for token a vault
        // 注意这里是自定义seed, 而不是使用ATA标准的seeds,
        // SPL Token的接收方不一定必须是ATA, 可以是自定义seed和bump的Token Account
        seeds = [token_mint.key().as_ref(), pool_authority.key().as_ref(), VAULT_SEED.as_bytes()],
        bump,
        payer = payer,
    )]
    pub token_vault: InterfaceAccount<'info, token_interface::TokenAccount>, // 持有本stake pool的所有token

    // The reward token mint for staking in this pool.
    // Mint of staking token
    #[account(
        mut,
        mint::token_program = token_program // 保持类型一直
    )]
    pub staking_token_mint: InterfaceAccount<'info, token_interface::Mint>, // 奖励代币

    // Account responsible for paying for the creation of the staking pool.
    // payer, will pay for creation of pool vault
    #[account(mut)]
    pub payer: Signer<'info>,

    // he token program associated with the given token and mint accounts.
    // Should work for either the Token Extension or the Token program.
    pub token_program: Interface<'info, token_interface::TokenInterface>, // 兼容 token 和 token2022

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
