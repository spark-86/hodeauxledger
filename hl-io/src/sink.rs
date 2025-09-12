use anyhow::Result;
use hl_core::Rhex;

pub trait RhexSink {
    fn send(&mut self, r: &Rhex) -> Result<()>;
    fn flush(&mut self) -> Result<()> {
        Ok(())
    }
}
