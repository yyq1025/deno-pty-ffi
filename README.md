# Pty FFI (maintained fork)

> Fork of [sigmaSd/deno-pty-ffi](https://github.com/sigmaSd/deno-pty-ffi) (MIT),
> which appears unmaintained (no activity since 2025-10). All credit for the
> original design goes to [@sigmaSd](https://github.com/sigmaSd).
>
> **Fixed / added in this fork:**
>
> - **fix:** the PTY read thread died when a read chunk boundary split a
>   multi-byte UTF-8 codepoint (guaranteed under heavy CJK / emoji / TUI
>   output — e.g. running Claude Code's TUI froze the terminal permanently
>   with `PTY read non-UTF8 data: incomplete utf-8 byte sequence`). The
>   string API now carries the incomplete tail into the next read.
> - **feat: raw bytes API** — `readBytes(): { data: Uint8Array; done: boolean }`.
>   The stream stays raw bytes end-to-end; decode with a streaming
>   `TextDecoder` or hand chunks to a consumer that decodes itself (e.g.
>   xterm.js `write(Uint8Array)`). Unlike the string API, interior NUL bytes
>   pass through instead of erroring.
> - **note:** prefer a plain `readBytes()`/`read()` polling loop over
>   `pty.readable` under heavy output — the stream sleeps its polling
>   interval per chunk, which caps throughput.

deno wrapper over https://docs.rs/portable-pty/latest/portable_pty/ that exposes
a simple interface

## Usage

```ts
import { Pty } from "jsr:@yyq/pty-ffi";

const pty = new Pty("bash");

// executs ls -la repedetly and shows output
for await (const line of pty.readable) {
  console.log(line);
  pty.write("ls -la\n");
}
```

### Raw bytes API

For high-throughput consumers (terminals, proxies) read raw bytes and let the
consumer decode:

```ts
import { Pty } from "jsr:@yyq/pty-ffi";

const pty = new Pty("bash");
const decoder = new TextDecoder();
while (true) {
  const { data, done } = pty.readBytes();
  if (done) break;
  if (data.byteLength) {
    // or: term.write(data) — xterm.js decodes (and handles split codepoints) itself
    console.log(decoder.decode(data, { stream: true }));
  } else {
    await new Promise((r) => setTimeout(r, 10));
  }
}
```

You can also use noinit module, this module expects the user to initialize the
library before using it. (uesful when using deno compile or when wanting to
defer initialization)

```ts
import { instantiate, libName, Pty } from "jsr:@yyq/pty-ffi/noinit";

if (Deno.build.standalone) {
  await instantiate(`${import.meta.dirname}/${libName()}`);
} else {
  await instantiate();
}

const pty = new Pty("bash");

// executs ls -la repedetly and shows output
for await (const line of pty.readable) {
  console.log(line);
  pty.write("ls -la\n");
}
```

You can compile this with

```
deno compile --allow-ffi --include <libPath> myscript.ts
```

or even cross compile

```
deno compile --allow-ffi --include <libExePath> --target x86_64-pc-windows-msvc myscript.ts
```
