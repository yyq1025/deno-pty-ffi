/**
# Deno Pty FFI

deno wrapper over https://docs.rs/portable-pty/latest/portable_pty/ that exposes
a simple interface

## Usage

```ts
import { Pty } from "jsr:@yyq1025/pty-ffi";

const pty = new Pty("bash");

// executs ls -la repedetly and shows output
for await (const line of pty.readable) {
  console.log(line);
  pty.write("ls -la\n");
}
```

@module
*/

// Initialize the library
import { instantiate } from "./src/ffi.ts";
await instantiate();

export { Pty, type PtyReadResult } from "./src/mod.ts";
export type { CommandOptions, PtySize } from "./src/ffi.ts";
