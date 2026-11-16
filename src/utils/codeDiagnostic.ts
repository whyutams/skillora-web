export interface CodeDiagnostic {
  line: number;
  column?: number;
  message: string;
  severity: "error" | "warning";
}

// parsing pesan kesalahan kompilasi dari output compiler gcc atau python
export function parseCompilerErrors(compilerOutput: string): CodeDiagnostic[] {
  if (!compilerOutput) return [];
  const diagnostics: CodeDiagnostic[] = [];

  // pola umum gcc atau clang
  const gccPattern = /(?:prog\.cc|main\.cpp|<stdin>|input|code):(\d+)(?::(\d+))?:\s*(error|fatal error|warning):\s*(.+)/gi;
  let match: RegExpExecArray | null;

  while ((match = gccPattern.exec(compilerOutput)) !== null) {
    const line = parseInt(match[1], 10);
    const column = match[2] ? parseInt(match[2], 10) : undefined;
    const isWarn = match[3].toLowerCase() === "warning";
    const msg = match[4].trim();

    diagnostics.push({
      line,
      column,
      message: msg,
      severity: isWarn ? "warning" : "error",
    });
  }

  // pola python untuk syntax error
  if (diagnostics.length === 0 && compilerOutput.includes("SyntaxError")) {
    const pyPattern = /line (\d+)(?:, in|\n\s+.*?\n\s*\^?\s*(?:SyntaxError|IndentationError):\s*(.+))/gi;
    let pyMatch: RegExpExecArray | null;
    while ((pyMatch = pyPattern.exec(compilerOutput)) !== null) {
      diagnostics.push({
        line: parseInt(pyMatch[1], 10),
        message: pyMatch[2]?.trim() || "Kesalahan sintaksis kode",
        severity: "error",
      });
    }
  }

  return diagnostics;
}

// daftar kata kunci dan fungsi standar c dan cpp yang dikenali
const standardCppIdentifiers = new Set([
  "int", "float", "double", "char", "bool", "void", "string", "auto", "long", "short",
  "unsigned", "signed", "const", "static", "cout", "cin", "endl", "return", "if",
  "else", "for", "while", "do", "switch", "case", "default", "break", "continue",
  "using", "namespace", "std", "true", "false", "null", "nullptr", "sizeof", "struct",
  "class", "public", "private", "protected", "virtual", "override", "vector", "map",
  "set", "pair", "queue", "stack", "printf", "scanf", "getline", "main", "cerr", "clog",
  "include", "define", "ifndef", "endif", "ifdef", "pragma", "new", "delete", "this",
  "operator", "template", "typename", "try", "catch", "throw", "typedef", "inline",
  "fixed", "setprecision", "setw", "pow", "sqrt", "abs", "max", "min", "numeric_limits"
]);

// analisis diagnostik sintaks lokal waktu nyata untuk bahasa c dan cpp
function diagnoseCppSyntax(code: string): CodeDiagnostic[] {
  const diagnostics: CodeDiagnostic[] = [];
  const lines = code.split("\n");

  // kumpulkan identifier variabel yang dideklarasikan dalam kode pengguna
  const declaredIdentifiers = new Set<string>();
  const declRegex = /\b(?:int|float|double|char|bool|string|auto|long|short)\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)/g;
  let declMatch: RegExpExecArray | null;
  while ((declMatch = declRegex.exec(code)) !== null) {
    const parts = declMatch[1].split(",");
    parts.forEach((p) => {
      const name = p.trim().split("=")[0].trim().split("[")[0].trim();
      if (name) declaredIdentifiers.add(name);
    });
  }

  // kumpulkan nama fungsi yang didefinisikan
  const fnRegex = /\b(?:int|void|float|double|bool|string|auto)\s+([a-zA-Z_]\w*)\s*\(/g;
  let fnMatch: RegExpExecArray | null;
  while ((fnMatch = fnRegex.exec(code)) !== null) {
    if (fnMatch[1]) declaredIdentifiers.add(fnMatch[1]);
  }

  // stack untuk melacak pasangan kurung kurawal kurung biasa dan kurung siku
  const bracketStack: { char: string; line: number; col: number }[] = [];
  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    const lineText = lines[lineIdx];
    const trimmed = lineText.trim();

    // lewati baris kosong
    if (!trimmed) continue;

    let inString = false;
    let stringChar = "";
    let stringStartCol = 0;

    for (let colIdx = 0; colIdx < lineText.length; colIdx++) {
      const ch = lineText[colIdx];
      const nextCh = colIdx + 1 < lineText.length ? lineText[colIdx + 1] : "";

      // penanganan komentar blok
      if (inBlockComment) {
        if (ch === "*" && nextCh === "/") {
          inBlockComment = false;
          colIdx++;
        }
        continue;
      }

      // mulai komentar blok
      if (!inString && ch === "/" && nextCh === "*") {
        inBlockComment = true;
        colIdx++;
        continue;
      }

      // komentar baris tunggal abaikan sisa baris
      if (!inString && ch === "/" && nextCh === "/") {
        break;
      }

      // penanganan string atau karakter literal
      if (inString) {
        if (ch === "\\" && nextCh) {
          colIdx++;
          continue;
        }
        if (ch === stringChar) {
          inString = false;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = true;
        stringChar = ch;
        stringStartCol = colIdx + 1;
        continue;
      }

      // pelacakan kurung pembuka
      if (ch === "{" || ch === "(" || ch === "[") {
        bracketStack.push({ char: ch, line: lineNum, col: colIdx + 1 });
      }

      // pelacakan kurung penutup
      if (ch === "}" || ch === ")" || ch === "]") {
        const top = bracketStack.pop();
        if (!top) {
          diagnostics.push({
            line: lineNum,
            column: colIdx + 1,
            message: `unexpected '${ch}' (tanda '${ch}' tidak memiliki tanda pembuka)`,
            severity: "error",
          });
        } else {
          const expectedPairs: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
          if (expectedPairs[top.char] !== ch) {
            diagnostics.push({
              line: lineNum,
              column: colIdx + 1,
              message: `expected '${expectedPairs[top.char]}' but found '${ch}' (kurung tidak cocok)`,
              severity: "error",
            });
          }
        }
      }
    }

    // periksa string yang tidak ditutup pada akhir baris
    if (inString) {
      diagnostics.push({
        line: lineNum,
        column: stringStartCol,
        message: `missing terminating ${stringChar} character (tanda petik belum ditutup)`,
        severity: "error",
      });
    }

    // periksa sintaks preprocessor #include
    if (trimmed.startsWith("#include")) {
      const incRest = trimmed.slice(8).trim();
      if (!incRest || (!incRest.startsWith("<") && !incRest.startsWith('"'))) {
        diagnostics.push({
          line: lineNum,
          message: "#include membutuhkan <nama_header> atau \"nama_header\"",
          severity: "error",
        });
      } else if (incRest.startsWith("<") && !incRest.includes(">")) {
        diagnostics.push({
          line: lineNum,
          message: "tanda kurung siku header <...> belum ditutup dengan '>'",
          severity: "error",
        });
      }
    }

    // periksa pernyataan di dalam fungsi
    const insideFunction = bracketStack.some((b) => b.char === "{");
    const cleanLine = trimmed.replace(/\/\/.*$/, "").trim();

    if (insideFunction && cleanLine) {
      const isDirective = cleanLine.startsWith("#");
      const isComment = cleanLine.startsWith("/*") || cleanLine.startsWith("*");
      const isOpenBrace = cleanLine.endsWith("{");
      const isCloseBrace = cleanLine.endsWith("}");
      const isLabel = cleanLine.endsWith(":") || cleanLine.startsWith("case ") || cleanLine.startsWith("default");
      const isControl =
        /^(?:if|else|for|while|do|switch|catch)\b/.test(cleanLine) &&
        !cleanLine.includes(";") &&
        (cleanLine.endsWith(")") || cleanLine.endsWith("else"));
      const isContinued =
        cleanLine.endsWith(",") ||
        cleanLine.endsWith("\\") ||
        cleanLine.endsWith("<<") ||
        cleanLine.endsWith(">>") ||
        cleanLine.endsWith("+") ||
        cleanLine.endsWith("-") ||
        cleanLine.endsWith("*") ||
        cleanLine.endsWith("/") ||
        cleanLine.endsWith("=") ||
        cleanLine.endsWith("||") ||
        cleanLine.endsWith("&&");

      // periksa baris yang hanya berupa token atau kata asing yang tidak dikenali
      const singleWordMatch = cleanLine.match(/^([a-zA-Z_]\w*);?$/);
      if (singleWordMatch) {
        const word = singleWordMatch[1];
        const lowerWord = word.toLowerCase();
        if (
          !standardCppIdentifiers.has(lowerWord) &&
          !declaredIdentifiers.has(word) &&
          word !== "main"
        ) {
          diagnostics.push({
            line: lineNum,
            message: `'${word}' was not declared in this scope (identifier '${word}' tidak dikenali atau belum dideklarasikan)`,
            severity: "error",
          });
          continue;
        }
      }

      // periksa titik koma yang hilang pada pernyataan biasa
      if (
        !isDirective &&
        !isComment &&
        !isOpenBrace &&
        !isCloseBrace &&
        !isLabel &&
        !isControl &&
        !isContinued &&
        !cleanLine.endsWith(";")
      ) {
        diagnostics.push({
          line: lineNum,
          message: "expected ';' at end of statement (pernyataan harus diakhiri tanda titik koma ';')",
          severity: "error",
        });
      }
    }
  }

  // periksa jika ada kurung pembuka yang belum memiliki penutup saat kode selesai
  while (bracketStack.length > 0) {
    const unclosed = bracketStack.pop()!;
    const matchingClose: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
    const closeChar = matchingClose[unclosed.char] || unclosed.char;
    const targetLine = lines.length;

    diagnostics.push({
      line: unclosed.line,
      column: unclosed.col,
      message: `kurung pembuka '${unclosed.char}' belum memiliki kurung penutup '${closeChar}'`,
      severity: "error",
    });

    if (targetLine !== unclosed.line) {
      diagnostics.push({
        line: targetLine,
        column: 1,
        message: `expected '${closeChar}' at end of input (kurung '${unclosed.char}' di baris ${unclosed.line} belum ditutup)`,
        severity: "error",
      });
    }
  }

  return diagnostics;
}

// daftar kata kunci dan fungsi bawaan python yang dikenali
const standardPythonIdentifiers = new Set([
  "print", "input", "int", "float", "str", "bool", "list", "dict", "set", "tuple",
  "len", "range", "def", "class", "return", "if", "elif", "else", "for", "while",
  "import", "from", "as", "in", "not", "and", "or", "is", "try", "except", "finally",
  "with", "raise", "break", "continue", "pass", "yield", "lambda", "global", "nonlocal",
  "assert", "del", "true", "false", "none", "self"
]);

// analisis diagnostik sintaks lokal waktu nyata untuk bahasa python
function diagnosePythonSyntax(code: string): CodeDiagnostic[] {
  const diagnostics: CodeDiagnostic[] = [];
  const lines = code.split("\n");
  const parenStack: { char: string; line: number }[] = [];

  // kumpulkan variabel yang dideklarasikan
  const declaredPy = new Set<string>();
  const pyDeclRegex = /^\s*([a-zA-Z_]\w*)\s*=/gm;
  let pyMatch: RegExpExecArray | null;
  while ((pyMatch = pyDeclRegex.exec(code)) !== null) {
    if (pyMatch[1]) declaredPy.add(pyMatch[1]);
  }

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    const lineText = lines[lineIdx];
    const trimmed = lineText.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    // periksa titik dua setelah if elif else for while def class
    if (
      /^(?:if|elif|else|for|while|def|class|try|except|finally|with)\b/.test(trimmed) &&
      !trimmed.endsWith(":")
    ) {
      diagnostics.push({
        line: lineNum,
        message: "expected ':' at end of header statement",
        severity: "error",
      });
    }

    // periksa token tunggal asing
    const singleWord = trimmed.match(/^([a-zA-Z_]\w*)$/);
    if (singleWord) {
      const w = singleWord[1];
      const lower = w.toLowerCase();
      if (!standardPythonIdentifiers.has(lower) && !declaredPy.has(w)) {
        diagnostics.push({
          line: lineNum,
          message: `name '${w}' is not defined (nama '${w}' belum didefinisikan)`,
          severity: "error",
        });
      }
    }

    // pelacakan kurung buka tutup
    for (const ch of lineText) {
      if (ch === "(" || ch === "[" || ch === "{") {
        parenStack.push({ char: ch, line: lineNum });
      } else if (ch === ")" || ch === "]" || ch === "}") {
        parenStack.pop();
      }
    }
  }

  while (parenStack.length > 0) {
    const unclosed = parenStack.pop()!;
    diagnostics.push({
      line: lines.length,
      message: `expected matching bracket for '${unclosed.char}' opened at line ${unclosed.line}`,
      severity: "error",
    });
  }

  return diagnostics;
}

// fungsi utama untuk menganalisis kode secara otomatis
export function analyzeCodeSyntax(
  code: string,
  language = "cpp"
): CodeDiagnostic[] {
  if (!code || !code.trim()) return [];
  const normalized = (language || "cpp").toLowerCase();

  if (normalized.includes("python") || normalized === "py") {
    return diagnosePythonSyntax(code);
  }

  return diagnoseCppSyntax(code);
}
