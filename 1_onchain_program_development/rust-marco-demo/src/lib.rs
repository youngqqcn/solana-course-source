use proc_macro::TokenStream;
use syn::parse_macro_input;

mod my_proc;

#[proc_macro]
pub fn my_proc_macro(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input);
    my_proc::my_proc_impl(input)
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

#[test]
fn ui() {
    // let t = trybuild::TestCases::new();
    // t.compile_fail("tests/ui/*.rs");

    // my_proc_macro!(42);
}