use borsh::BorshSerialize;
use solana_program::program_pack::IsInitialized;
use solana_program::{
    account_info::next_account_info,
    account_info::AccountInfo,
    borsh0_10::try_from_slice_unchecked,
    // borsh::try_from_slice_unchecked,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

pub mod instruction;
use instruction::MovieInstruction;
pub mod state;
use state::MovieAccountState;
pub mod error;
use error::ReviewError;

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey, // Public key of the account the hello world program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    instruction_data: &[u8], // Ignored, all helloworld instructions are hellos
) -> ProgramResult {
    // msg!("Hello World Rust program entrypoint");

    let instruction = MovieInstruction::unpack(instruction_data)?;
    match instruction {
        MovieInstruction::AddMovieReview {
            title,
            rating,
            description,
        } => add_movie_review(program_id, accounts, title, rating, description),

        MovieInstruction::UpdateMovieReview {
            title,
            rating,
            description,
        } => update_movie_review(program_id, accounts, title, rating, description),
    }
}

pub fn add_movie_review(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    title: String,
    rating: u8,
    description: String,
) -> ProgramResult {
    msg!("Adding movie review...");
    msg!("Title: {}", title);
    msg!("Rating:{}", rating);
    msg!("Description:{}", description);

    // 获取账户
    let account_info_iter = &mut accounts.iter();
    //
    let initializer = next_account_info(account_info_iter)?;
    let pda_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // 计算PDA ,
    let (pda, bump_seed) = Pubkey::find_program_address(
        &[initializer.key.as_ref(), title.as_bytes().as_ref()],
        program_id,
    );

    // 安全检查: 应该将 PDA 和 输入的PDA 进行对比
    // BUG: 此时 PDA账号尚未创建，因此不能判断owner
    // if pda_account.owner != program_id {
    //     msg!("programId is not matched");
    //     return Err(ProgramError::IncorrectProgramId);
    // }

    if !initializer.is_signer {
        msg!("not signer");
        return Err(ProgramError::MissingRequiredSignature);
    }

    if pda != *pda_account.key {
        msg!("invalid seed for PDA");
        return Err(ReviewError::InvalidPDA.into());
    }

    // 数据检查
    if rating > 5 || rating < 1 {
        msg!("Rating cannot be higher than 5");
        return Err(ReviewError::InvalidRating.into());
    }

    let total_len: usize = 1 + 1 + (4 + title.len()) + (4 + description.len());
    if total_len > 1000 {
        msg!("Data length is larger than 1000 bytes");
        return Err(ReviewError::InvalidDataLength.into());
    }

    // 计算账户大小
    // let account_len: usize = 1 + 1 + (4 + title.len()) + (4 + description.len());

    let account_len: usize = 1000;

    // 计算租金
    let rent_x = Rent::get()?;
    let rent_lamports = rent_x.minimum_balance(account_len);

    invoke_signed(
        &system_instruction::create_account(
            initializer.key,
            &pda,
            rent_lamports,
            account_len.try_into().unwrap(),
            program_id,
        ),
        &[
            initializer.clone(),
            pda_account.clone(),
            system_program.clone(),
        ],
        &[&[
            initializer.key.as_ref(),
            title.as_bytes().as_ref(),
            &[bump_seed],
        ]],
    )?;

    msg!("PDA created: {}", pda);

    msg!("unpacking state account");
    let mut account_data =
        try_from_slice_unchecked::<MovieAccountState>(&pda_account.data.borrow()).unwrap();
    msg!("borrowed account account");
    account_data.is_initialized = true;
    account_data.rating = rating;
    account_data.description = description;
    account_data.title = title;

    // 写回去
    account_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;

    Ok(())
}
// 成功交易： https://explorer.solana.com/tx/3LTsVv82mpx5EqGpPvNd5xu6S2ubAtSq1TQD1fRuMV4o5MpqM3w4foyQnFJLSnSuE437VQvr2yPEW2ow5PQQ6ZGH?cluster=devnet

// 更新评论
pub fn update_movie_review(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    title: String,
    rating: u8,
    description: String,
) -> ProgramResult {
    msg!("Adding movie review...");
    msg!("Title: {}", title);
    msg!("Rating:{}", rating);
    msg!("Description:{}", description);

    // 获取账户
    let account_info_iter = &mut accounts.iter();
    //
    let initializer = next_account_info(account_info_iter)?;
    let pda_account = next_account_info(account_info_iter)?;
    // let system_program = next_account_info(account_info_iter)?;

    msg!("unpacking state account");
    let mut account_data =
        try_from_slice_unchecked::<MovieAccountState>(&pda_account.data.borrow()).unwrap();
    msg!("borrowed account account");

    if !account_data.is_initialized() {
        msg!("account is not initialized");
        return Err(ReviewError::UninitializedAccount.into());
    }

    // 计算PDA ,
    let (pda, _bump_seed) = Pubkey::find_program_address(
        &[initializer.key.as_ref(), title.as_bytes().as_ref()],
        program_id,
    );

    // 安全检查: 应该将 PDA 和 输入的PDA 进行对比
    if pda_account.owner != program_id {
        msg!("programId is not matched");
        return Err(ProgramError::IncorrectProgramId);
    }
    if !initializer.is_signer {
        msg!("not signer");
        return Err(ProgramError::MissingRequiredSignature);
    }

    if pda != *pda_account.key {
        // msg!("invalid seed for PDA");
        return Err(ReviewError::InvalidPDA.into());
    }

    // 数据检查
    if rating > 5 || rating < 1 {
        msg!("Rating cannot be higher than 5");
        return Err(ReviewError::InvalidRating.into());
    }

    let total_len: usize = 1 + 1 + (4 + title.len()) + (4 + description.len());
    if total_len > 1000 {
        msg!("Data length is larger than 1000 bytes");
        return Err(ReviewError::InvalidDataLength.into());
    }

    msg!("review title: {}", account_data.title);
    // 更新数据
    account_data.description = description;
    account_data.rating = rating;
    msg!("====Review after update:====");
    msg!("Title: {}", account_data.title);
    msg!("Rating: {}", account_data.rating);
    msg!("Description: {}", account_data.description);

    msg!("write in account");
    account_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;
    msg!("updated finished");
    Ok(())
}
