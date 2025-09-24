use clap::{Args, Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(name = "rhex-craft", about = "HodeauxLedger R⬢ Crafting Tool")]
pub struct Cli {
    #[arg(short, long, global = true)]
    pub verbose: bool,

    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    Design(DesignArgs),
    Craft(CraftArgs),
    Finalize(FinalizeArgs),
    Validate(ValidateArgs),
    View(ViewArgs),
}

#[derive(Args, Debug)]
pub struct Io {
    #[arg(short, long)]
    pub input: Option<String>,
    #[arg(short, long)]
    pub output: String,
}

#[derive(Args, Debug)]
pub struct DesignArgs {
    #[command(flatten)]
    pub io: Io,
}

#[derive(Args, Debug)]
pub struct CraftArgs {
    #[command(flatten)]
    pub io: Io,
    #[arg(short, long, value_name = "BASE64HASH")]
    pub previous_hash: Option<String>,
    #[arg(short, long)]
    pub scope: String,
    #[arg(short, long)]
    pub nonce: Option<String>,
    #[arg(short, long, value_name = "BASE64PK")]
    pub author_pk: String,
    #[arg(short, long, value_name = "BASE64PK")]
    pub usher_pk: String,
    #[arg(short, long)]
    pub record_type: String,
    #[arg(short, long, value_name = "FILE")]
    pub data: String,
}

#[derive(Args, Debug)]
pub struct FinalizeArgs {
    #[command(flatten)]
    pub io: Io,
}

#[derive(Args, Debug)]
pub struct ValidateArgs {
    #[command(flatten)]
    pub io: Io,
}

#[derive(Args, Debug)]
pub struct ViewArgs {
    #[arg(short, long)]
    pub input: String,

    #[arg(short, long)]
    pub base64: bool,
}
