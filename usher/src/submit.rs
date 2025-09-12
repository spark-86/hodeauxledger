use std::time::Duration;
use std::{path::PathBuf, str::FromStr};

use hl_io::{
    fs::rhex::FileSource, net::net::Transport, screen::print::pretty_print, source::RhexSource,
};

use crate::argv::SubmitArgs;

pub async fn submit(submit_args: &SubmitArgs) -> Result<(), anyhow::Error> {
    let input = &submit_args.input;
    let output = &submit_args.output;
    let host = &submit_args.host;
    let port = &submit_args.port;
    let dry_run = &submit_args.dry_run;

    let host = if host.is_none() {
        "127.0.0.1"
    } else {
        host.as_ref().unwrap()
    };
    let port = if port.is_none() {
        "1984"
    } else {
        port.as_ref().unwrap()
    };

    println!("Submitting: {}", input);

    let rhex_in = FileSource::new(PathBuf::from_str(&input.clone())?)?.next()?;
    if rhex_in.is_none() {
        anyhow::bail!("Invalid Rhex");
    }
    let rhex_in = rhex_in.unwrap();

    let mut transport = Transport::new();
    transport.connect(host, port).await?;
    transport.send_rhex(&rhex_in).await?;
    let mut count = 0;
    loop {
        count += 1;
        if count > 10 {
            break;
        }
        let rhex_out = transport
            .recv_next_with_timeout(Duration::from_millis(1500))
            .await?;
        println!("{}", count);
        if rhex_out.is_none() {
            break;
        }
        let rhex_out = rhex_out.unwrap();
        pretty_print(&rhex_out)?;
        println!("{}", count);
    }
    if !dry_run {
        transport.close().await;
    }
    let _ = output;
    transport.print_stats();
    Ok(())
}
