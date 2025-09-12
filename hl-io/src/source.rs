use hl_core::Rhex;

pub trait RhexSource {
    fn next(&mut self) -> Result<Option<Rhex>, anyhow::Error>;
}
