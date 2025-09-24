use anyhow::Error;
use bytes::BytesMut;
use futures::{SinkExt, StreamExt};
use hl_core::{Config, Key, Rhex, keymaster::keymaster::Keymaster};
use hl_io::net::codec::RhexCodec;
use hl_services::process;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::time::Instant;
use tokio_util::codec::{Encoder, Framed};

use crate::argv::ListenArgs;

pub struct ConnStats {
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub rhex_sent: u64,
    pub rhex_received: u64,
}

impl ConnStats {
    pub fn new() -> Self {
        Self {
            bytes_sent: 0,
            bytes_received: 0,
            rhex_sent: 0,
            rhex_received: 0,
        }
    }
    pub fn add_in(&mut self, bytes: usize) {
        self.bytes_received += bytes as u64;
        self.rhex_received += 1;
    }
    pub fn add_out(&mut self, bytes: usize) {
        self.bytes_sent += bytes as u64;
        self.rhex_sent += 1;
    }
}

async fn setup_listener(host: &str, port: &str) -> Result<TcpListener, Error> {
    let addr = format!("{host}:{port}");
    Ok(TcpListener::bind(addr).await?)
}

// NOTE: take Arc<Config> by value, not &Config
async fn accept_loop(listener: TcpListener, verbose: bool, config: Arc<Config>) {
    // you can use `&*config` here if you need it in this scope
    loop {
        match listener.accept().await {
            Ok((stream, addr)) => {
                println!("📡🟢 -> {addr}");
                // clone the Arc into the task so it satisfies 'static
                let cfg = Arc::clone(&config);
                tokio::spawn(async move {
                    if let Err(e) = handle_conn(stream, addr, verbose, cfg).await {
                        eprintln!("⚠️ {addr} error: {e}");
                    }
                    println!("📡🔴 -> {addr}");
                });
            }
            Err(e) => {
                eprintln!("⚠️ accept error: {e}");
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }
    }
}

// NOTE: accept Arc<Config> by value (cheap clone, 'static safe)
async fn handle_conn(
    stream: tokio::net::TcpStream,
    addr: std::net::SocketAddr,
    verbose: bool,
    config: Arc<Config>,
) -> Result<(), Error> {
    let framed = Framed::new(stream, RhexCodec::new());
    let (mut sink, mut stream) = framed.split();

    let mut stats = ConnStats::new();
    let mut codec = RhexCodec::new();

    // example: read from config, no clone needed
    let _bind_info = &config.host; // or whatever fields you have

    while let Some(in_msg) = stream.next().await {
        let started = Instant::now();
        let rhex_in: Rhex = in_msg?; // decode via RhexCodec

        let mut in_buf = BytesMut::new();
        codec.encode(rhex_in.clone(), &mut in_buf)?;
        let in_len = in_buf.len();
        stats.add_in(in_len);

        if verbose {
            println!(
                "📥 {addr} in: {} bytes | record_type: {}",
                in_len, rhex_in.intent.record_type
            );
        }

        // do your real handling here, using `config` if needed
        let mut keymaster = Keymaster::new();
        for key in config.hot_keys.iter() {
            keymaster.hot_keys.push(Key::from_bytes(*key));
        }
        let out_rhex = process::process_rhex(&rhex_in, true, &config, &keymaster)?;
        //let out_rhex = vec![rhex_in];

        for rhex in out_rhex {
            let mut out_buf = BytesMut::new();
            codec.encode(rhex.clone(), &mut out_buf)?;
            let out_len = out_buf.len();
            sink.send(rhex).await?;
            sink.flush().await?;
            stats.add_out(out_len);
        }

        if verbose {
            let elapsed = started.elapsed();
            println!(
                "📤 {addr} out: {} bytes | took: {} ms",
                stats.bytes_sent,
                elapsed.as_millis()
            );
        }
    }

    println!(
        "📊 {addr} summary: in {} records / {} bytes | out {} records / {} bytes",
        stats.rhex_received, stats.bytes_received, stats.rhex_sent, stats.bytes_sent
    );

    Ok(())
}

pub async fn listen(listen_args: &ListenArgs, verbose: bool) -> Result<(), Error> {
    let port = &listen_args.port;
    let host = &listen_args.host;
    let config_file = &listen_args.config;
    let config_file = if config_file.is_some() {
        config_file.as_ref().unwrap()
    } else {
        &"config.json".to_string()
    };
    let config = Arc::new(hl_services::config::load_config(config_file)?); // ← wrap in Arc

    let listener = setup_listener(host, port).await?;
    println!("[LISTENING {host}:{port}]");

    // shutdown task
    let shutdown = tokio::spawn(async {
        let _ = tokio::signal::ctrl_c().await;
        println!("\n[SHUTDOWN SIGNAL RECEIVED]")
    });

    tokio::select! {
        _ = accept_loop(listener, verbose, Arc::clone(&config)) => {}
        _ = shutdown => {}
    }

    println!("[BYE!]");
    Ok(())
}
