// utilitas parsing langkah masukan interaktif kode program untuk terminal konsol
export interface InteractiveInputStep {
  type: "cin" | "getline" | "input";
  promptOutput: string;
  varName?: string;
}

// parsing segmen keluaran dan titik masukan program c++ dan python
export function parseInteractiveSteps(
  code: string,
  language: string = "cpp"
): InteractiveInputStep[] {
  const steps: InteractiveInputStep[] = [];
  const lang = (language || "").toLowerCase();

  if (lang.includes("python") || lang === "py") {
    // ekstrak pola input() pada python
    const lines = code.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      // cocokkan pola var = input("prompt")
      const inputMatch = line.match(/(?:(\w+)\s*=\s*)?input\s*\(\s*(?:(['"])(.*?)\2)?\s*\)/);
      if (inputMatch) {
        const varName = inputMatch[1] || "input";
        const prompt = inputMatch[3] ? inputMatch[3].replace(/\\n/g, "\n") : "";
        steps.push({
          type: "input",
          promptOutput: prompt,
          varName,
        });
      }
    }
    return steps;
  }

  // default bahasa c dan c++
  const lines = code.split("\n");
  let accumulatedOutput = "";
  let insideMain = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // lewati komentar dan baris kosong
    if (!line || line.startsWith("//") || line.startsWith("/*")) continue;

    // tandai saat memasuki blok fungsi utama main
    if (!insideMain) {
      if (/int\s+main\s*\(/.test(line)) {
        insideMain = true;
      }
      continue;
    }

    // akumulasi keluaran cout
    if (line.includes("cout")) {
      const coutContent = line
        .replace(/^cout\s*<<\s*/, "")
        .replace(/;$/, "");

      const parts = coutContent.split("<<").map((p) => p.trim());
      for (const part of parts) {
        if (part === "endl") {
          accumulatedOutput += "\n";
        } else if (
          (part.startsWith('"') && part.endsWith('"')) ||
          (part.startsWith("'") && part.endsWith("'"))
        ) {
          accumulatedOutput += part.slice(1, -1).replace(/\\n/g, "\n").replace(/\\t/g, "\t");
        }
      }
    }

    // deteksi perintah cin
    const cinMatch = line.match(/cin\s*>>\s*([^;]+);/);
    const getlineMatch = line.match(/getline\s*\(\s*cin\s*,\s*([^)]+)\);/);

    if (cinMatch) {
      const vars = cinMatch[1].split(">>").map((v) => v.trim());
      for (const v of vars) {
        steps.push({
          type: "cin",
          promptOutput: accumulatedOutput,
          varName: v,
        });
        accumulatedOutput = "";
      }
    } else if (getlineMatch) {
      const v = getlineMatch[1].trim();
      steps.push({
        type: "getline",
        promptOutput: accumulatedOutput,
        varName: v,
      });
      accumulatedOutput = "";
    }
  }

  return steps;
}

// ekstrak keluaran akhir komputasi program setelah prompt masukan interaktif
export function extractFinalProgramOutput(
  fullOutput: string,
  steps: InteractiveInputStep[]
): string {
  if (!steps || steps.length === 0 || !fullOutput) return fullOutput;

  // cari posisi setelah prompt masukan terakhir
  for (let i = steps.length - 1; i >= 0; i--) {
    const prompt = (steps[i].promptOutput || "").trim();
    if (prompt && fullOutput.includes(prompt)) {
      const idx = fullOutput.lastIndexOf(prompt);
      const afterPrompt = fullOutput.slice(idx + prompt.length).trim();
      if (afterPrompt) return afterPrompt;
    }
  }

  return fullOutput;
}
