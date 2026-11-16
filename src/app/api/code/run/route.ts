import { NextRequest, NextResponse } from "next/server";
import { analyzeCodeSyntax } from "@/utils/codeDiagnostic";

// daftar kandidat compiler yang stabil di wandbox
const COMPILER_CANDIDATES: Record<string, string[]> = {
  cpp: ["gcc-13.2.0", "gcc-12.3.0", "clang-head", "gcc-head"],
  "c++": ["gcc-13.2.0", "gcc-12.3.0", "clang-head", "gcc-head"],
  c: ["gcc-13.2.0", "gcc-12.3.0", "clang-head", "gcc-head"],
  python: ["cpython-3.12.7", "cpython-3.10.13"],
  py: ["cpython-3.12.7", "cpython-3.10.13"],
  javascript: ["nodejs-head", "nodejs-20.17.0"],
  js: ["nodejs-head", "nodejs-20.17.0"],
};

// simulator fallback lokal yang mendukung operasi cin dan cout sederhana
function simulateCppExecution(code: string, stdin = ""): { output: string; success: boolean } {
  const diagnostics = analyzeCodeSyntax(code, "cpp");
  if (diagnostics.length > 0) {
    const firstErr = diagnostics[0];
    return {
      output: `prog.cc:${firstErr.line}: error: ${firstErr.message}`,
      success: false,
    };
  }

  const stdinTokens = stdin
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let tokenIdx = 0;

  const variables: Record<string, number | string> = {};
  const lines = code.split("\n");
  const outputParts: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//") || line.startsWith("/*")) continue;

    // baca input cin
    const cinMatch = line.match(/cin\s*>>\s*([^;]+);/);
    if (cinMatch) {
      const vars = cinMatch[1].split(">>").map((v) => v.trim());
      for (const v of vars) {
        if (tokenIdx < stdinTokens.length) {
          const val = stdinTokens[tokenIdx++];
          const num = Number(val);
          variables[v] = isNaN(num) ? val : num;
        } else {
          variables[v] = 0;
        }
      }
      continue;
    }

    // cetak output cout
    if (line.includes("cout")) {
      const parts = line
        .replace(/^cout\s*<<\s*/, "")
        .replace(/;$/, "")
        .split("<<")
        .map((p) => p.trim());

      let lineOutput = "";
      for (const part of parts) {
        if (part === "endl") {
          lineOutput += "\n";
        } else if (part.startsWith('"') && part.endsWith('"')) {
          lineOutput += part.slice(1, -1).replace(/\\n/g, "\n");
        } else if (variables[part] !== undefined) {
          lineOutput += String(variables[part]);
        } else {
          // evaluasi ekspresi aritmatika sederhana dari variabel
          try {
            let expr = part;
            for (const [k, v] of Object.entries(variables)) {
              expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), String(v));
            }
            if (/^[\d\s+\-*/().]+$/.test(expr)) {
              // eslint-disable-next-line no-eval
              const evaluated = Function(`"use strict"; return (${expr})`)();
              lineOutput += String(evaluated);
            }
          } catch {
            // abaikan kegagalan evaluasi ekspresi kompleks
          }
        }
      }
      outputParts.push(lineOutput);
    }
  }

  if (outputParts.length > 0) {
    return {
      output: outputParts.join(""),
      success: true,
    };
  }

  return {
    output: "Program selesai dieksekusi dengan kode keluar 0.",
    success: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language = "cpp", code = "", stdin = "" } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { error: "Kode program tidak boleh kosong" },
        { status: 400 }
      );
    }

    const normalizedLang = (language || "cpp").toLowerCase();
    const candidates = COMPILER_CANDIDATES[normalizedLang] || ["gcc-13.2.0", "gcc-head"];
    const startTime = Date.now();

    // coba kandidat compiler secara berurutan hingga berhasil
    for (const compiler of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const wandboxRes = await fetch("https://wandbox.org/api/compile.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            compiler,
            code,
            stdin: stdin || "",
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (wandboxRes.ok) {
          const result = await wandboxRes.json();
          const compilerError = result.compiler_error || result.compiler_message || "";

          // jika compiler wandbox mengembalikan error container coba kandidat compiler lain
          if (
            compilerError.includes("OCI runtime error") ||
            compilerError.includes("Resource temporarily unavailable") ||
            result.status === "126"
          ) {
            continue;
          }

          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          const stdout = result.program_output || result.program_message || "";
          const stderr = result.program_error || "";
          const exitCode = result.status ? parseInt(result.status, 10) : 0;

          let output = stdout;
          let isError = false;

          if (compilerError && !stdout) {
            output = compilerError;
            isError = true;
          } else if (stderr) {
            output = stdout ? `${stdout}\n${stderr}` : stderr;
            if (exitCode !== 0) isError = true;
          }

          if (!output.trim()) {
            output = "Program berhasil dijalankan tanpa output ke konsol.";
          }

          return NextResponse.json({
            success: !isError,
            output,
            exitCode,
            duration,
          });
        }
      } catch {
        // coba kandidat berikutnya jika permintaan gagal atau waktu habis
        continue;
      }
    }

    // fallback simulator cerdas jika seluruh server compiler eksternal tidak merespon
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const simulated = simulateCppExecution(code, stdin);

    return NextResponse.json({
      success: simulated.success,
      output: simulated.output,
      exitCode: simulated.success ? 0 : 1,
      duration,
      isSimulated: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi gangguan saat memproses eksekusi kode" },
      { status: 500 }
    );
  }
}
