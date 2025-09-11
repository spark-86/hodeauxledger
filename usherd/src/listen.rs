use anyhow::Error;
use bytes::BytesMut;
use futures::{SinkExt, StreamExt};
use hl_core::Rhex;
use hl_io::net::codec::RhexCodec;
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

async fn accept_loop(listener: TcpListener, verbose: bool, hot_key: &Option<String>) {
    let _ = hot_key; // This was to pass the key down to handle_conn but tokio fucks us on that.
    loop {
        match listener.accept().await {
            Ok((stream, addr)) => {
                println!("📡🟢 -> {addr}");
                tokio::spawn(async move {
                    if let Err(e) = handle_conn(stream, addr, verbose).await {
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

async fn handle_conn(
    stream: tokio::net::TcpStream,
    addr: std::net::SocketAddr,
    verbose: bool,
) -> Result<(), Error> {
    let framed = Framed::new(stream, RhexCodec::new());
    let (mut sink, mut stream) = framed.split();

    let mut stats = ConnStats::new();
    let mut codec = RhexCodec::new();

    while let Some(in_msg) = stream.next().await {
        let started = Instant::now();
        let rhex_in: Rhex = in_msg?; // decode via RhexCodec

        // Measure inbound size by re-encoding with the same codec.
        let mut in_buf = BytesMut::new();
        codec.encode(rhex_in.clone(), &mut in_buf)?;
        let in_len = in_buf.len();
        stats.add_in(in_len);

        if verbose {
            // If your Rhex has getters, feel free to swap these placeholders.
            println!(
                "📥 {addr} in: {} bytes | did: verify+echo | record_type: {}",
                in_len,
                rhex_in.intent.record_type // adjust if your API differs
            );
        }

        // TODO: replace this with real server-side handling:
        //   - verify author's sig / linkage
        //   - maybe co-sign as usher
        //   - maybe emit quorum status / finalization
        // For now, echo the same record as a simple ACK.
        // (We also measure the encoded outbound size the same way.)
        if verbose {
            println!("🧩 Processing record...");
        }
        //let out_rhex = processor::process_rhex(&rhex_in, &hot_key, verbose)?;
        let out_rhex = vec![rhex_in];
        if verbose {
            println!("🧩 Processed record");
        }
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
                "📤 {addr} out: {} bytes | action: echo | took: {} ms",
                stats.bytes_sent,
                elapsed.as_millis()
            );
        }
    }

    // Per-connection summary
    println!(
        "📊 {addr} summary: in {} records / {} bytes | out {} records / {} bytes",
        stats.rhex_received, stats.bytes_received, stats.rhex_sent, stats.bytes_sent
    );

    Ok(())
}

pub async fn listen(listen_args: &ListenArgs, verbose: bool) -> Result<(), Error> {
    let port = &listen_args.port;
    let host = &listen_args.host;
    let hot_key = &listen_args.hot_key;

    let listener = setup_listener(host, port).await?;
    println!("[LISTENING {host}:{port}]");

    // wait on Ctrl+C to bail
    let shutdown = tokio::spawn(async {
        let _ = tokio::signal::ctrl_c().await;
        println!("\n[SHUTDOWN SIGNAL RECEIVED]")
    });

    tokio::select! {
        _ = accept_loop(listener, verbose, hot_key) => {}
        _ = shutdown => {}
    }

    println!("[BYE!]");
    Ok(())
}
