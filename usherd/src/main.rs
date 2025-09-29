use clap::Parser;

use crate::{argv::Commands, httpd::start_http_server};

mod argv;
mod bootstrap;
mod httpd;
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
            let http_server_handle = tokio::spawn(start_http_server(listen_args.clone()));
            let status = listen::listen(&listen_args, parsed.verbose).await;
            if status.is_err() {
                http_server_handle.abort();
                println!("Error: {:?}", status.err().unwrap());
                std::process::exit(1);
            } else {
                http_server_handle.abort();
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
