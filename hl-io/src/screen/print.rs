use hl_core::Rhex;

pub fn pretty_print(rhex: &Rhex) -> Result<(), anyhow::Error> {
    println!("{:?}", rhex);
    Ok(())
}
