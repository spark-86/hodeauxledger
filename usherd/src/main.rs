use clap::Parser;

use crate::argv::Commands;

mod argv;
mod bootstrap;
mod listen;
mod rebuild;

fn print_banner() {
    println!("HodeauxLedger Usher Daemon");
    println!("==========================");
}

#[tokio::main]
async fn main() {
    print_banner();

    let parsed = argv::Cli::parse();

    match parsed.command {
        Commands::Listen(listen_args) => {
            // Bootstrap ourselves into a ledger
            let _ = bootstrap::bootstrap(&listen_args);

            let status = listen::listen(&listen_args, parsed.verbose).await;
            if status.is_err() {
                println!("Error: {:?}", status.err().unwrap());
                std::process::exit(1);
            } else {
                std::process::exit(0);
            }
        }
        Commands::Rebuild(rebuild_args) => {
            let status = rebuild::rebuild(&rebuild_args);
            if status.is_err() {
                std::process::exit(1);
            } else {
                std::process::exit(0);
            }
        }
    }
}
