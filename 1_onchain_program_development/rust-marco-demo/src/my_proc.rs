use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, spanned::Spanned, Error, LitInt, Result};

pub fn my_proc_impl(input: TokenStream) -> Result<TokenStream> {
    let span = input.span();
    let ans = parse2::<LitInt>(input)?.base10_parse::<i32>()?;
    if ans != 42 {
        return Err(Error::new(span, "Answer should be 42"));
    }

    Ok(quote!(println!("Answer: {}", #ans);))
}