use crate::instruction::MovieInstruction;
use crate::state::{MovieAccountState, MovieComment};
use crate::{error::ReviewError, state::MovieCommentCounter};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    program_pack::IsInitialized,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
use std::convert::TryInto;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
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
        MovieInstruction::AddComment { comment } => add_comment(program_id, accounts, comment),
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
    msg!("Rating: {}", rating);
    msg!("Description: {}", description);

    let account_info_iter = &mut accounts.iter();

    let initializer = next_account_info(account_info_iter)?;
    let pda_account = next_account_info(account_info_iter)?;
    let pda_counter_input = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    let (pda_review, bump_seed) = Pubkey::find_program_address(
        &[initializer.key.as_ref(), title.as_bytes().as_ref()],
        program_id,
    );
    if pda_review != *pda_account.key {
        msg!("Invalid seeds for PDA");
        return Err(ProgramError::InvalidArgument);
    }

    if rating > 5 || rating < 1 {
        msg!("Rating cannot be higher than 5");
        return Err(ReviewError::InvalidRating.into());
    }

    let total_len: usize = MovieAccountState::get_account_size(title.clone(), description.clone());
    if total_len > 1000 {
        msg!("Data length is larger than 1000 bytes");
        return Err(ReviewError::InvalidDataLength.into());
    }

    let account_len: usize = 1000;

    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(account_len);

    invoke_signed(
        &system_instruction::create_account(
            initializer.key,
            pda_account.key,
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

    msg!("PDA created: {}", pda_review);

    msg!("unpacking state account");
    // let mut account_data =
    // try_from_slice_unchecked::<MovieAccountState>(&pda_account.data.borrow()).unwrap();
    let mut account_data = MovieAccountState::deserialize(&mut &pda_account.data.borrow()[..])?;
    msg!("borrowed account data");

    msg!("checking if movie account is already initialized");
    if account_data.is_initialized() {
        msg!("Account already initialized");
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    account_data.discriminator = MovieAccountState::DISCRIMINATOR.to_owned();
    account_data.title = title;
    account_data.reviewer = *initializer.key;
    account_data.rating = rating;
    account_data.description = description;
    account_data.is_initialized = true;

    msg!("serializing account");
    account_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;
    msg!("state account serialized");

    msg!("create comment counter account");

    let rent = Rent::get()?;
    let counter_rent_lamports = rent.minimum_balance(MovieCommentCounter::SIZE);
    let (counter_pda, counter_bump) =
        Pubkey::find_program_address(&[pda_review.as_ref(), "comment".as_ref()], program_id);

    // 比较计算出来的pda 和 输入的pda是否一致
    if counter_pda != *pda_counter_input.key {
        msg!("Invalid seeds for PDA");
        return Err(ProgramError::InvalidArgument);
    }

    invoke_signed(
        &system_instruction::create_account(
            initializer.key,
            &counter_pda,
            counter_rent_lamports,
            MovieCommentCounter::SIZE as u64,
            program_id,
        ),
        &[
            initializer.clone(),
            pda_counter_input.clone(),
            pda_account.clone(),
            system_program.clone(),
        ],
        &[&[pda_review.as_ref(), "comment".as_ref(), &[counter_bump]]],
    )?;
    msg!("comment counter pda account created successfully");

    // 获取 counter账户
    // let mut counter_data =
    //     try_from_slice_unchecked::<MovieCommentCounter>(&pda_account.data.borrow()).unwrap();

    let mut counter_data =
        MovieCommentCounter::deserialize(&mut &pda_counter_input.data.borrow_mut()[..])?;

    msg!("checking if counter pda account is already initialized");
    if counter_data.is_initialized() {
        msg!("counter pda account is already initialized");
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    counter_data.discriminator = MovieCommentCounter::DISCRIMINATOR.to_owned();
    counter_data.counter = 0; //初始为0 , 表示该 review 目前没有评论
    counter_data.is_initialized = true;
    counter_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;
    msg!("comment count : {}", counter_data.counter);

    Ok(())
}

pub fn update_movie_review(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    title: String,
    rating: u8,
    description: String,
) -> ProgramResult {
    msg!("Updating movie review...");

    let account_info_iter = &mut accounts.iter();

    let initializer = next_account_info(account_info_iter)?;
    let pda_account = next_account_info(account_info_iter)?;
    let _pda_counter = next_account_info(account_info_iter)?;

    if pda_account.owner != program_id {
        return Err(ProgramError::IllegalOwner);
    }

    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    msg!("unpacking state account");
    // let mut account_data =
    // try_from_slice_unchecked::<MovieAccountState>(&pda_account.data.borrow()).unwrap();
    let mut account_data = MovieAccountState::deserialize(&mut &pda_account.data.borrow()[..])?;

    msg!("review title: {}", account_data.title);

    let (pda, _bump_seed) = Pubkey::find_program_address(
        &[
            initializer.key.as_ref(),
            account_data.title.as_bytes().as_ref(),
        ],
        program_id,
    );
    if pda != *pda_account.key {
        msg!("Invalid seeds for PDA");
        return Err(ReviewError::InvalidPDA.into());
    }

    msg!("checking if movie account is initialized");
    if !account_data.is_initialized() {
        msg!("Account is not initialized");
        return Err(ReviewError::UninitializedAccount.into());
    }

    if rating > 5 || rating < 1 {
        msg!("Invalid Rating");
        return Err(ReviewError::InvalidRating.into());
    }

    let update_len: usize = MovieAccountState::get_account_size(title, description.clone());
    if update_len > 1000 {
        msg!("Data length is larger than 1000 bytes");
        return Err(ReviewError::InvalidDataLength.into());
    }

    msg!("Review before update:");
    msg!("Title: {}", account_data.title);
    msg!("Rating: {}", account_data.rating);
    msg!("Description: {}", account_data.description);

    account_data.rating = rating;
    account_data.description = description;

    msg!("Review after update:");
    msg!("Title: {}", account_data.title);
    msg!("Rating: {}", account_data.rating);
    msg!("Description: {}", account_data.description);

    msg!("serializing account");
    account_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;
    msg!("state account serialized");

    Ok(())
}

pub fn add_comment(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    comment: String,
) -> ProgramResult {
    msg!("Adding comment to a review");
    msg!("comment: {}", comment);

    let account_info_iter = &mut accounts.iter();

    let commenter = next_account_info(account_info_iter)?;
    let pda_review = next_account_info(account_info_iter)?;
    let pda_counter = next_account_info(account_info_iter)?;
    let pda_comment_input = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // let mut counter_data =
    // try_from_slice_unchecked::<MovieCommentCounter>(&pda_counter.data.borrow_mut()).unwrap();
    let mut counter_data =
        MovieCommentCounter::deserialize(&mut &pda_counter.data.borrow_mut()[..])?;

    // TODO:
    let account_len = MovieComment::get_account_size(comment.clone());
    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(account_len);

    let (pda_comment, bump_seed) = Pubkey::find_program_address(
        &[
            pda_review.key.as_ref(),
            counter_data.counter.to_be_bytes().as_ref(),
        ],
        program_id,
    );
    if pda_comment != *pda_comment_input.key {
        msg!("invalid seed for comment pda");
        return Err(ProgramError::InvalidArgument);
    }

    // 创建commnet pda 账户
    invoke_signed(
        &system_instruction::create_account(
            commenter.key,
            pda_comment_input.key,
            rent_lamports,
            account_len as u64,
            program_id,
        ),
        &[
            commenter.clone(),
            pda_comment_input.clone(),
            system_program.clone(),
        ],
        &[&[
            pda_review.key.as_ref(),
            counter_data.counter.to_be_bytes().as_ref(),
            &[bump_seed],
        ]],
    )?;

    //  获取 commment  账户数据
    // let mut comment_data =
    // try_from_slice_unchecked::<MovieComment>(&pda_comment_input.data.borrow_mut())?;

    let mut comment_data =
        MovieComment::deserialize(&mut &pda_comment_input.data.borrow_mut()[..])?;

    if comment_data.is_initialized() {
        msg!("Account already initialized");
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    // 更新 comment 数据
    comment_data.discriminator = MovieComment::DISCRIMINATOR.to_string();
    comment_data.comment = comment.clone();
    comment_data.commenter = *commenter.key;
    comment_data.is_initialized = true;
    comment_data.serialize(&mut &mut pda_comment_input.data.borrow_mut()[..])?;

    // 更新评论的计数  commnet counter
    msg!("comment count: {}", counter_data.counter);
    counter_data.counter += 1;
    counter_data.serialize(&mut &mut pda_counter.data.borrow_mut()[..])?;

    Ok(())
}
