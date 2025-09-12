use clap::Parser;

use crate::argv::Commands;

mod argv;
mod submit;

fn print_banner() {
    println!("HodeauxLedger Usher");
    println!("===================");
}

#[tokio::main]
async fn main() {
    print_banner();
    let parsed = argv::Cli::parse();
    match parsed.command {
        Commands::Submit(submit_args) => {
            let status = submit::submit(&submit_args).await;
            match status {
                Ok(_) => {
                    println!("Success");
                }
                Err(e) => {
                    println!("Error: {}", e);
                }
            }
        }
    }
}
