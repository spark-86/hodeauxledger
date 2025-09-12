use std::process;

use clap::Parser;

mod argv;
mod create;

fn print_banner() {
    println!("+=======================================+");
    println!("| Genesis Creation Tool - HodeauxLedger |");
    println!("+=======================================+");
}

fn main() {
    print_banner();
    let parsed = argv::Cli::parse();

    match parsed.command {
        argv::Commands::Create(create_args) => {
            let status = create::create(&create_args);
            match status {
                Ok(_) => {
                    process::exit(0);
                }
                Err(e) => {
                    println!("Error: {}", e);
                    process::exit(1);
                }
            }
        }
    }
}
