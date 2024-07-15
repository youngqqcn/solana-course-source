use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

declare_id!("9eyVUWKL7jXk5YH1pY8VyJPfXR5vDd9vksaKcxFpX4xt");

#[program]
pub mod anchor_student_intro_program {
    use std::io::Result;

    use super::*;

    pub fn create_student_intro(
        ctx: Context<CreateStudentIntro>,
        name: String,
        intro: String,
    ) -> Result<()> {
        msg!("student_intro account created!");
        msg!("name: {}", name);
        msg!("intro : {}", intro);

        let student_intro = &mut ctx.accounts.student_intro_account;

        student_intro.name = name;
        student_intro.intro = intro;

        Ok(())
    }

    pub fn update_student_intro(
        ctx: Context<UpdateStudentIntro>,
        name: String,
        intro: String,
    ) -> Result<()> {
        let student_intro = &mut ctx.accounts.student_intro_account;
        student_intro.name = name;
        student_intro.intro = intro;

        msg!("student intro updated");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitialzeMint<'info> {
    #[account(
        init,
        payer=user,
        seeds=["mint".as_bytes()],
        bump,
        mint::decimals=6,
        mint::authority=mint,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, intro: String)]
pub struct CreateStudentIntro<'info> {
    #[account(
        init,
        payer=initializer,
        space=StudentIntroState::INIT_SPACE + name.len() + intro.len(),
        seeds=[name.as_bytes(), initializer.key().as_ref()],
        bump,
    )]
    pub student_intro_account: Account<'info, StudentIntroState>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, intro: String)]
pub struct UpdateStudentIntro<'info> {
    #[account(
        mut,
        seeds=[name.as_bytes(), initializer.key().as_ref()],
        bump,
        realloc=StudentIntroState::INIT_SPACE + name.len() + intro.len(),
        realloc::payer=initializer,
        realloc::zero=true,
    )]
    pub student_intro_account: Account<'info, StudentIntroState>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct StudentIntroState {
    pub name: String,
    pub intro: String,
}

impl Space for StudentIntroState {
    const INIT_SPACE: usize = 8 + 4 + 4;
}
