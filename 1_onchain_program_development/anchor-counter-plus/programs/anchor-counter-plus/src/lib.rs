use anchor_lang::prelude::*;

declare_id!("Hm5ATvxsAvrrrUrgof6dyCLP3V4NQkATpCfQpmQzXjCk");

#[program]
pub mod anchor_counter_plus {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let counter = &mut ctx.accounts.counter_account;
        counter.counter = 0;
        msg!("initialized with 0");
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter_account;
        msg!("previous : {:?}", counter.counter);
        counter.counter = counter.counter.checked_add_signed(1).unwrap();
        msg!("after increment: {:?}", counter.counter);
        Ok(())
    }

    pub fn decrement(ctx: Context<Decrement>) -> Result<()> {
        let counter = &mut ctx.accounts.counter_account;
        msg!("previous : {:?}", counter.counter);
        counter.counter = counter.counter.checked_add_signed(-1).unwrap();
        msg!("update decrement: {:?}", counter.counter);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer=user, space=8+8)]
    pub counter_account: Account<'info, CounterPlus>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter_account: Account<'info, CounterPlus>,
    // #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct Decrement<'info> {
    #[account(mut)]
    pub counter_account: Account<'info, CounterPlus>,
    pub user: Signer<'info>,
}

#[account]
pub struct CounterPlus {
    counter: u64,
}
