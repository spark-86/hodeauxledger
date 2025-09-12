use clap::Parser;
mod argv;
mod craft;
mod design;
mod finalize;
mod genesis;
mod validate;
mod view;

fn main() {
    let parsed = argv::Cli::parse();
    println!("{:?}", parsed);
    match parsed.command {
        argv::Commands::Design(design_args) => {
            design::design(&design_args);
        }
        argv::Commands::Craft(craft_args) => {
            let status = craft::craft(&craft_args);
            match status {
                Ok(_) => {}
                Err(e) => {
                    println!("Error: {}", e);
                }
            }
        }
        argv::Commands::Finalize(finalize_args) => {
            let status = finalize::finalize(&finalize_args);
            match status {
                Ok(_) => {}
                Err(e) => {
                    println!("Error: {}", e);
                }
            }
        }
        argv::Commands::Validate(validate_args) => {
            validate::validate(&validate_args);
        }
        argv::Commands::View(view_args) => {
            view::view(&view_args);
        }
    }
}
