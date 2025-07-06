console.log("before");

await new Promise((r) => setTimeout(r, 100));

console.log("after");
