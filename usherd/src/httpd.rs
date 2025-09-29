use axum::{
    Router,
    extract::{Json, State},
    routing::post,
};
use serde::{Deserialize, Serialize};
use std::{io::Cursor, sync::Arc};

use crate::argv::ListenArgs;
use hl_core::{Rhex, from_base64, to_base64};

#[derive(Deserialize)]
struct AppendRequest {
    // base64-encoded CBOR blob
    rhex_b64: String,
}

#[derive(Serialize)]
struct AppendResponse {
    ok: bool,
    current_hash: Option<String>,
    error: Option<String>,
}

async fn process(rhex: &Rhex, _args: Arc<ListenArgs>) -> anyhow::Result<Rhex> {
    // Do nothing for now
    Ok(rhex.clone())
}

async fn append_handler(
    State(listen_args): State<Arc<ListenArgs>>,
    Json(req): Json<AppendRequest>,
) -> Json<AppendResponse> {
    // Step 1: decode base64
    let raw_bytes = match from_base64(&req.rhex_b64) {
        Ok(b) => b,
        Err(e) => {
            return Json(AppendResponse {
                ok: false,
                current_hash: None,
                error: Some(format!("base64 decode error: {e}")),
            });
        }
    };

    // Step 2: decode CBOR -> Rhex using ciborium
    let rhex: Rhex = match ciborium::de::from_reader(Cursor::new(&raw_bytes)) {
        Ok(r) => r,
        Err(e) => {
            return Json(AppendResponse {
                ok: false,
                current_hash: None,
                error: Some(format!("CBOR decode error: {e}")),
            });
        }
    };

    // Step 3: process
    match process(&rhex, listen_args).await {
        Ok(r) => {
            // serialize hash back to base64
            let hash_b64 = r.current_hash.clone().map(|h| to_base64(h.as_ref()));

            Json(AppendResponse {
                ok: true,
                current_hash: hash_b64,
                error: None,
            })
        }
        Err(e) => Json(AppendResponse {
            ok: false,
            current_hash: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn start_http_server(listen_args: ListenArgs) {
    let shared = Arc::new(listen_args);

    let app = Router::new()
        .route("/append", post(append_handler))
        .with_state(shared);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:1978").await.unwrap();
    println!(
        "🛰️ usherd REST listening on {}",
        listener.local_addr().unwrap()
    );
    axum::serve(listener, app).await.unwrap();
}
