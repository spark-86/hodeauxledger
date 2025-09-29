use crate::argv::MirrorArgs;

pub async fn mirror(mirror_args: &MirrorArgs) -> Result<(), anyhow::Error> {
    let _ = mirror_args;
    Ok(())
}
