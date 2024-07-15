use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    program_pack::{IsInitialized, Sealed},
    pubkey::Pubkey,
};

#[derive(BorshSerialize, BorshDeserialize)]
pub struct MovieAccountState {
    pub discriminator: String,
    pub is_initialized: bool,
    pub reviewer: Pubkey,
    pub rating: u8,
    pub description: String,
    pub title: String,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct MovieCommentCounter {
    pub discriminator: String,
    pub is_initialized: bool,
    pub counter: u64,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct MovieComment {
    pub discriminator: String,
    pub is_initialized: bool,
    pub review: Pubkey,
    pub commenter: Pubkey,
    pub comment: String,
    pub count: u64,
}

impl Sealed for MovieAccountState {}

impl IsInitialized for MovieAccountState {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl IsInitialized for MovieCommentCounter {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl IsInitialized for MovieComment {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl MovieAccountState {
    pub const DISCRIMINATOR: &'static str = "review";
    pub fn get_account_size(title: String, description: String) -> usize {
        return (4 + MovieAccountState::DISCRIMINATOR.len())
            + 1
            + 32 // for reviewer's PubKey
            + (4 + description.len())
            + (4 + title.len());
    }
}

impl MovieCommentCounter {
    pub const DISCRIMINATOR: &'static str = "review";
    pub const SIZE: usize = (4 + MovieCommentCounter::DISCRIMINATOR.len()) + 1 + 8;
}

impl MovieComment {
    pub const DISCRIMINATOR: &'static str = "review";
    pub fn get_account_size(comment: String) -> usize {
        return (4 + MovieComment::DISCRIMINATOR.len()) + 1 + 32 + 32 + (4 + comment.len()) + 8;
    }
}
