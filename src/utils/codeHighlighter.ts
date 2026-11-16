// utilitas penyorot sintaks kode bertema vscode dark+
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// penyorot kode bahasa c dan c++
function highlightCpp(code: string): string {
  const tokenRegex =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#include\s*(?:<[^>]+>|"[^"]+")|#define\b|#ifdef\b|#ifndef\b|#endif\b|#pragma\b)|(\b\d+(?:\.\d+)?(?:[fFuUlL]+)?\b)|(\b(?:int|float|double|char|bool|void|long|short|unsigned|signed|size_t|string|vector|map|set|auto|nullptr)\b)|(\b(?:return|if|else|for|while|do|switch|case|default|break|continue|goto|try|catch|throw)\b)|(\b(?:using|namespace|const|new|delete|sizeof|typedef|struct|class|public|private|protected|virtual|override|static|template|typename|true|false|this)\b)|(\b(?:cout|cin|cerr|endl|printf|scanf)\b)|(\b[a-zA-Z_]\w*(?=\s*\())|([{}()\[\]])|([<>+\-*\/%=!&|^~:;,\.])/g;

  let lastIndex = 0;
  let html = "";
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      html += escapeHtml(code.slice(lastIndex, match.index));
    }
    lastIndex = tokenRegex.lastIndex;

    const [
      full,
      comment,
      stringLit,
      preproc,
      numberLit,
      typeKw,
      controlKw,
      modifierKw,
      stdStream,
      funcName,
      bracket,
      operator,
    ] = match;

    if (comment) {
      // komentar hijau vscode
      html += `<span style="color:#6a9955;">${escapeHtml(comment)}</span>`;
    } else if (stringLit) {
      // string oranye hangat vscode
      html += `<span style="color:#ce9178;">${escapeHtml(stringLit)}</span>`;
    } else if (preproc) {
      // preprocessor ungu vscode
      const incMatch = preproc.match(/(#include\s*)(<[^>]+>|"[^"]+")/);
      if (incMatch) {
        html += `<span style="color:#c586c0;">${escapeHtml(
          incMatch[1]
        )}</span><span style="color:#ce9178;">${escapeHtml(incMatch[2])}</span>`;
      } else {
        html += `<span style="color:#c586c0;">${escapeHtml(preproc)}</span>`;
      }
    } else if (numberLit) {
      // angka hijau muda sage vscode
      html += `<span style="color:#b5cea8;">${escapeHtml(numberLit)}</span>`;
    } else if (typeKw) {
      // tipe data toska teal vscode
      html += `<span style="color:#4ec9b0;">${escapeHtml(typeKw)}</span>`;
    } else if (controlKw) {
      // kata kunci kontrol ungu vscode
      html += `<span style="color:#c586c0;">${escapeHtml(controlKw)}</span>`;
    } else if (modifierKw) {
      // kata kunci struktur biru terang vscode
      html += `<span style="color:#569cd6;">${escapeHtml(modifierKw)}</span>`;
    } else if (stdStream) {
      // aliran iostream toska vscode
      html += `<span style="color:#4ec9b0;">${escapeHtml(stdStream)}</span>`;
    } else if (funcName) {
      // nama fungsi kuning lembut vscode
      html += `<span style="color:#dcdcaa;">${escapeHtml(funcName)}</span>`;
    } else if (bracket) {
      // pasangan kurung pelangi vscode
      const bracketColors: Record<string, string> = {
        "(": "#ffd700",
        ")": "#ffd700",
        "{": "#da70d6",
        "}": "#da70d6",
        "[": "#179fff",
        "]": "#179fff",
      };
      const col = bracketColors[bracket] || "#d4d4d4";
      html += `<span style="color:${col};">${escapeHtml(bracket)}</span>`;
    } else if (operator) {
      html += `<span style="color:#d4d4d4;">${escapeHtml(operator)}</span>`;
    } else {
      html += escapeHtml(full);
    }
  }

  if (lastIndex < code.length) {
    html += escapeHtml(code.slice(lastIndex));
  }

  return html;
}

// penyorot kode bahasa python
function highlightPython(code: string): string {
  const tokenRegex =
    /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|f"(?:\\.|[^"\\])*"|f'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|(\b(?:def|class|return|if|elif|else|for|while|try|except|finally|raise|with|pass|break|continue|yield|lambda)\b)|(\b(?:import|from|as|in|is|not|and|or|global|nonlocal)\b)|(\b(?:True|False|None)\b)|(\b(?:print|len|range|int|str|float|list|dict|set|tuple|bool|input|sum|min|max|enumerate|zip|type|open)\b)|(\b[a-zA-Z_]\w*(?=\s*\())|([{}()\[\]])|([<>+\-*\/%=!&|^~:;,\.])/g;

  let lastIndex = 0;
  let html = "";
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      html += escapeHtml(code.slice(lastIndex, match.index));
    }
    lastIndex = tokenRegex.lastIndex;

    const [
      full,
      comment,
      stringLit,
      numberLit,
      controlKw,
      modifierKw,
      boolLit,
      builtinFn,
      funcName,
      bracket,
      operator,
    ] = match;

    if (comment) {
      html += `<span style="color:#6a9955;">${escapeHtml(comment)}</span>`;
    } else if (stringLit) {
      html += `<span style="color:#ce9178;">${escapeHtml(stringLit)}</span>`;
    } else if (numberLit) {
      html += `<span style="color:#b5cea8;">${escapeHtml(numberLit)}</span>`;
    } else if (controlKw) {
      html += `<span style="color:#c586c0;">${escapeHtml(controlKw)}</span>`;
    } else if (modifierKw) {
      html += `<span style="color:#569cd6;">${escapeHtml(modifierKw)}</span>`;
    } else if (boolLit) {
      html += `<span style="color:#569cd6;">${escapeHtml(boolLit)}</span>`;
    } else if (builtinFn) {
      html += `<span style="color:#dcdcaa;">${escapeHtml(builtinFn)}</span>`;
    } else if (funcName) {
      html += `<span style="color:#dcdcaa;">${escapeHtml(funcName)}</span>`;
    } else if (bracket) {
      const bracketColors: Record<string, string> = {
        "(": "#ffd700",
        ")": "#ffd700",
        "{": "#da70d6",
        "}": "#da70d6",
        "[": "#179fff",
        "]": "#179fff",
      };
      const col = bracketColors[bracket] || "#d4d4d4";
      html += `<span style="color:${col};">${escapeHtml(bracket)}</span>`;
    } else if (operator) {
      html += `<span style="color:#d4d4d4;">${escapeHtml(operator)}</span>`;
    } else {
      html += escapeHtml(full);
    }
  }

  if (lastIndex < code.length) {
    html += escapeHtml(code.slice(lastIndex));
  }

  return html;
}

// penyorot kode web javascript dan html
function highlightWeb(code: string): string {
  const tokenRegex =
    /(<!--[\s\S]*?-->|\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(<\/?[a-zA-Z0-9\-]+|[>])|(\b\d+(?:\.\d+)?\b)|(\b(?:function|return|if|else|for|while|try|catch|throw|new|class|extends|async|await)\b)|(\b(?:const|let|var|import|export|from|default|typeof|instanceof|void|delete|null|undefined|true|false)\b)|(\b(?:console|document|window|Math|Array|Object|String|Number)\b)|(\b[a-zA-Z_]\w*(?=\s*\())|([{}()\[\]])|([<>+\-*\/%=!&|^~:;,\.])/g;

  let lastIndex = 0;
  let html = "";
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      html += escapeHtml(code.slice(lastIndex, match.index));
    }
    lastIndex = tokenRegex.lastIndex;

    const [
      full,
      comment,
      stringLit,
      htmlTag,
      numberLit,
      controlKw,
      modifierKw,
      builtinObj,
      funcName,
      bracket,
      operator,
    ] = match;

    if (comment) {
      html += `<span style="color:#6a9955;">${escapeHtml(comment)}</span>`;
    } else if (stringLit) {
      html += `<span style="color:#ce9178;">${escapeHtml(stringLit)}</span>`;
    } else if (htmlTag) {
      html += `<span style="color:#569cd6;">${escapeHtml(htmlTag)}</span>`;
    } else if (numberLit) {
      html += `<span style="color:#b5cea8;">${escapeHtml(numberLit)}</span>`;
    } else if (controlKw) {
      html += `<span style="color:#c586c0;">${escapeHtml(controlKw)}</span>`;
    } else if (modifierKw) {
      html += `<span style="color:#569cd6;">${escapeHtml(modifierKw)}</span>`;
    } else if (builtinObj) {
      html += `<span style="color:#4ec9b0;">${escapeHtml(builtinObj)}</span>`;
    } else if (funcName) {
      html += `<span style="color:#dcdcaa;">${escapeHtml(funcName)}</span>`;
    } else if (bracket) {
      const bracketColors: Record<string, string> = {
        "(": "#ffd700",
        ")": "#ffd700",
        "{": "#da70d6",
        "}": "#da70d6",
        "[": "#179fff",
        "]": "#179fff",
      };
      const col = bracketColors[bracket] || "#d4d4d4";
      html += `<span style="color:${col};">${escapeHtml(bracket)}</span>`;
    } else if (operator) {
      html += `<span style="color:#d4d4d4;">${escapeHtml(operator)}</span>`;
    } else {
      html += escapeHtml(full);
    }
  }

  if (lastIndex < code.length) {
    html += escapeHtml(code.slice(lastIndex));
  }

  return html;
}

// fungsi utama penyorotan kode sesuai bahasa
export function highlightCode(code: string, language: string = "cpp"): string {
  if (!code) return "";
  const lang = (language || "").toLowerCase();

  if (lang.includes("python") || lang === "py") {
    return highlightPython(code);
  }

  if (lang.includes("web") || lang.includes("js") || lang.includes("html")) {
    return highlightWeb(code);
  }

  // default bahasa c dan c++
  return highlightCpp(code);
}

