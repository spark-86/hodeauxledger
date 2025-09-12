pub mod authority;
pub mod rhex;

pub enum StoreStream {
    StdIn = 0,
    Memory = 1,
    FileSystem = 2,
    QrCode = 3,
}

pub enum StoreSink {
    StdOut = 0,
    Memory = 1,
    FileSystem = 2,
    QrCode = 3,
}
