use clap::{Args, Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(name = "rhex-craft", about = "HodeauxLedger R⬢ Crafting Tool")]
pub struct Cli {
    #[arg(short, long, global = true)]
    pub verbose: bool,

    #[arg(short, long, global = true)]
    pub config: Option<String>,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    Listen(ListenArgs),
    Rebuild(RebuildArgs),
}

#[derive(Args, Debug)]
pub struct ListenArgs {
    #[arg(short, long)]
    pub port: String,
    #[arg(long)]
    pub host: String,
    #[arg(short, long)]
    pub config: Option<String>,
}

#[derive(Args, Debug)]
pub struct RebuildArgs {
    #[arg(short, long)]
    pub config: Option<String>,
}
