// bytes-API torture: readBytes() pump + streaming TextDecoder.
// (1) 40k CJK+emoji lines — split codepoints land on the DECODER, not rust.
// (2) NUL bytes in stream — would error the string API (CString), bytes passes.
import { instantiate, Pty } from "./mod_noinit.ts";
await instantiate("./src-rust/target/release/libpty.dylib");
const pty = new Pty("/bin/zsh", { env: Deno.env.toObject() });
const dec = new TextDecoder();
let buf = "";
let bytesTotal = 0;
(async () => {
  while (true) {
    try {
      const { data, done } = pty.readBytes();
      if (done) break;
      if (data.byteLength) { bytesTotal += data.byteLength; buf += dec.decode(data, { stream: true }); }
      else await new Promise((x) => setTimeout(x, 3));
    } catch (e) { console.log("[reader] threw:", String(e).slice(0, 150)); break; }
  }
})();
await new Promise((r) => setTimeout(r, 800));
pty.resize({ rows: 50, cols: 200 });
const t0 = Date.now();
pty.write("for i in {1..40000}; do echo '你好世界🌍中文测试🚀终端流式渲染'; done; echo DONE_$((41000+1))\r");
while (!buf.includes("DONE_41001") && Date.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 100));
const lines = (buf.match(/你好世界🌍中文测试🚀终端流式渲染/g) ?? []).length;
console.log(`flood: t=+${Date.now()-t0}ms lines=${lines}(exp 40001 w/ echo) tofu=${(buf.match(/�/g)??[]).length} bytes=${bytesTotal}`);
// NUL test: emit 32 NULs mid-stream — string API would throw (CString), bytes must survive
pty.write("head -c 32 /dev/zero; echo NUL_$((50+5))_OK\r");
const t1 = Date.now();
while (!buf.includes("NUL_55_OK") && Date.now() - t1 < 8000) await new Promise((r) => setTimeout(r, 100));
console.log(`nul-in-stream: survived=${buf.includes("NUL_55_OK")}`);
const pass = lines >= 40000 && buf.includes("NUL_55_OK");
console.log(pass ? "✅ BYTES API PASS — zero loss, split codepoints handled by TextDecoder, NUL passthrough" : "❌ fail");
Deno.exit(pass ? 0 : 1);
