pub struct Errors {
    pub stack: Vec<String>,
    pub messages: Vec<String>,
}

impl Errors {
    pub fn new() -> Self {
        Self {
            stack: Vec::new(),
            messages: Vec::new(),
        }
    }
    pub fn push(&mut self, code: &str, msg: impl Into<String>) {
        self.stack.push(code.to_string());
        self.messages.push(msg.into());
    }
    pub fn is_empty(&self) -> bool {
        self.stack.is_empty()
    }
    pub fn join_messages(&self) -> String {
        self.messages.join(", ")
    }
}
