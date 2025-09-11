use clap::Parser;

use crate::argv::Commands;

mod argv;
mod generate;
mod sign;
mod verify;
mod view;

fn print_banner() {
    println!("HodeauxLedger Key Tool");
    println!("======================");
}

fn main() {
    let parsed = argv::Cli::parse();
    print_banner();

    match parsed.command {
        Commands::Generate(gen_args) => {
            let status = generate::generate_keypair(&gen_args);
            match status {
                Ok(_) => {}
                Err(e) => {
                    println!("Error: {}", e);
                }
            }
        }
        Commands::Sign(sign_args) => sign::sign(&sign_args).expect("Failed to sign"),
        Commands::Verify(verify_args) => verify::verify(&verify_args).expect("Failed to verify"),
        Commands::View(view_args) => view::view(&view_args).expect("Failed to view"),
    }
}
