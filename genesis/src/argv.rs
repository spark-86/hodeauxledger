use clap::{Args, Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(name = "genesis", about = "HodeauxLedger Genesis Tool")]
pub struct Cli {
    #[arg(short, long, global = true)]
    pub verbose: bool,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    Create(CreateArgs),
}

#[derive(Args, Debug)]
pub struct CreateArgs {
    #[arg(short, long)]
    pub note: Option<String>,

    #[arg(short, long, value_name = "FILE")]
    pub keyfile: String,

    #[command(flatten)]
    pub io: Io,
}

#[derive(Args, Debug)]
pub struct Io {
    #[arg(short, long, value_name = "FILE")]
    pub input: Option<String>,

    #[arg(short, long, value_name = "FILE")]
    pub output: String,
}
