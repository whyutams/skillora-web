"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Code2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  CheckCircle2,
  FileCode,
  Keyboard,
  Search,
  ArrowUp,
  ArrowDown,
  X,
  Replace,
  Send,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { highlightCode } from "@/utils/codeHighlighter";
import {
  analyzeCodeSyntax,
  parseCompilerErrors,
  CodeDiagnostic,
} from "@/utils/codeDiagnostic";
import {
  parseInteractiveSteps,
  extractFinalProgramOutput,
  InteractiveInputStep,
} from "@/utils/interactiveRunner";

interface TerminalEntry {
  id: string;
  text: string;
  type: "cmd" | "out" | "err" | "sys";
}

interface WebCodeEditorProps {
  initialCode?: string;
  language?: "cpp" | "python" | "javascript" | "web" | string;
  fileName?: string;
  title?: string;
  tips?: string;
  onChange?: (code: string) => void;
}

// helper batas awal dan akhir baris dari posisi kursor
function getLineBounds(text: string, start: number, end: number) {
  let lineStart = text.lastIndexOf("\n", start - 1);
  lineStart = lineStart === -1 ? 0 : lineStart + 1;

  // jika seleksi berujung di batas newline jangan sertakan baris berikutnya
  const searchEnd = end > start && text[end - 1] === "\n" ? Math.max(start, end - 1) : end;
  let lineEnd = text.indexOf("\n", searchEnd);
  lineEnd = lineEnd === -1 ? text.length : lineEnd;

  return { lineStart, lineEnd };
}

export default function WebCodeEditor({
  initialCode = "// tulis kode program anda di sini\n",
  language = "cpp",
  fileName,
  title = "Editor Praktik & Eksekusi Kode",
  tips,
  onChange,
}: WebCodeEditorProps) {
  const [code, setCode] = React.useState(initialCode);
  const [terminalEntries, setTerminalEntries] = React.useState<TerminalEntry[]>([]);
  const [isAwaitingInput, setIsAwaitingInput] = React.useState(false);
  const [terminalInput, setTerminalInput] = React.useState("");
  const [pendingSteps, setPendingSteps] = React.useState<InteractiveInputStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = React.useState(0);
  const [collectedInputs, setCollectedInputs] = React.useState<string[]>([]);
  const [showShortcutsModal, setShowShortcutsModal] = React.useState(false);
  const [output, setOutput] = React.useState<string | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "running" | "success" | "error">("idle");
  const [duration, setDuration] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [savedTooltip, setSavedTooltip] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // referensi elemen masukan baris terminal
  const terminalInputRef = React.useRef<HTMLInputElement>(null);

  // kunci scroll halaman saat mode layar penuh aktif
  React.useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  // deteksi apakah kode membutuhkan input pengguna cin atau input
  const codeNeedsInput = React.useMemo(() => {
    const lowerLang = (language || "").toLowerCase();
    if (lowerLang.includes("python") || lowerLang === "py") {
      return /\b(?:input\s*\(|sys\.stdin)/.test(code);
    }
    return /\b(?:cin\s*>>|getline\s*\(\s*cin|scanf\s*\()/i.test(code);
  }, [code, language]);

  // fitur pencarian dan penggantian teks di editor
  const [showFind, setShowFind] = React.useState(false);
  const [showReplace, setShowReplace] = React.useState(false);
  const [findQuery, setFindQuery] = React.useState("");
  const [replaceQuery, setReplaceQuery] = React.useState("");
  const [findMatches, setFindMatches] = React.useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = React.useState(0);
  const findInputRef = React.useRef<HTMLInputElement>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const preRef = React.useRef<HTMLPreElement>(null);
  const lineNumbersRef = React.useRef<HTMLDivElement>(null);

  // referensi posisi seleksi kursor yang akan diterapkan setelah pembaruan dom
  const pendingSelectionRef = React.useRef<{ start: number; end: number } | null>(null);

  // riwayat undo dan redo internal editor
  const historyRef = React.useRef<{ code: string; start: number; end: number }[]>([
    { code: initialCode, start: 0, end: 0 },
  ]);
  const historyIndexRef = React.useRef<number>(0);
  const isUndoRedoActionRef = React.useRef<boolean>(false);

  // catat perubahan teks ke riwayat undo redo
  const recordHistory = React.useCallback(
    (newCode: string, newStart: number, newEnd: number) => {
      if (isUndoRedoActionRef.current) return;
      const history = historyRef.current.slice(0, historyIndexRef.current + 1);
      history.push({ code: newCode, start: newStart, end: newEnd });
      // batasi maksimal 50 langkah riwayat
      if (history.length > 50) history.shift();
      historyRef.current = history;
      historyIndexRef.current = history.length - 1;
    },
    []
  );

  // sinkronkan kursor textarea secara presisi di fase layout effect sebelum paint
  React.useLayoutEffect(() => {
    if (pendingSelectionRef.current && textareaRef.current) {
      const { start, end } = pendingSelectionRef.current;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
      pendingSelectionRef.current = null;
    }
  }, [code]);

  // diagnostik sintaks lokal dan kesalahan kompilasi
  const [compilerDiagnostics, setCompilerDiagnostics] = React.useState<CodeDiagnostic[]>([]);

  // sinkronkan kode saat materi atau kerangka kode berubah
  React.useEffect(() => {
    setCode(initialCode);
    setOutput(null);
    setTerminalEntries([]);
    setIsAwaitingInput(false);
    setTerminalInput("");
    setPendingSteps([]);
    setCurrentStepIdx(0);
    setCollectedInputs([]);
    setStatus("idle");
    setDuration(null);
    setCompilerDiagnostics([]);
    historyRef.current = [{ code: initialCode, start: 0, end: 0 }];
    historyIndexRef.current = 0;
  }, [initialCode]);

  // analisis diagnostik sintaks kode lokal secara waktu nyata
  const localDiagnostics = React.useMemo(() => {
    return analyzeCodeSyntax(code, language);
  }, [code, language]);

  // gabungkan seluruh diagnostik sintaks lokal dan kompilasi
  const allDiagnostics = React.useMemo(() => {
    const map = new Map<number, CodeDiagnostic>();
    localDiagnostics.forEach((d) => map.set(d.line, d));
    compilerDiagnostics.forEach((d) => map.set(d.line, d));
    return Array.from(map.values()).sort((a, b) => a.line - b.line);
  }, [localDiagnostics, compilerDiagnostics]);

  // fungsi untuk melompatkan kursor ke nomor baris tertentu
  const scrollToLine = React.useCallback(
    (lineNumber: number) => {
      if (!textareaRef.current) return;
      const lines = code.split("\n");
      let charPos = 0;
      for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
        charPos += lines[i].length + 1;
      }
      textareaRef.current.focus();
      textareaRef.current.selectionStart = charPos;
      textareaRef.current.selectionEnd =
        charPos + (lines[lineNumber - 1]?.length || 0);

      const lineHeight = 22;
      const targetScrollTop = Math.max(0, (lineNumber - 3) * lineHeight);
      textareaRef.current.scrollTop = targetScrollTop;
    },
    [code]
  );

  // hitung jumlah baris kode
  const lineCount = React.useMemo(() => {
    return Math.max(1, code.split("\n").length);
  }, [code]);

  // sorot sintaks kode dengan tema vscode dark+ dan garis bawah bergelombang merah untuk error
  const highlightedHtml = React.useMemo(() => {
    const baseHtml = highlightCode(code, language);
    if (allDiagnostics.length === 0) return baseHtml;

    const lines = baseHtml.split("\n");
    const errorLines = new Map<number, CodeDiagnostic>();
    allDiagnostics.forEach((d) => {
      if (!errorLines.has(d.line)) errorLines.set(d.line, d);
    });

    return lines
      .map((lineHtml, idx) => {
        const lineNum = idx + 1;
        const diag = errorLines.get(lineNum);
        if (!diag) return lineHtml;

        const isBlank = lineHtml.trim().length === 0;
        const content = isBlank ? "&nbsp;&nbsp;" : lineHtml;
        const escapedMsg = diag.message.replace(/"/g, "&quot;");
        return `<span class="vscode-squiggly-error" title="${escapedMsg}">${content}</span>`;
      })
      .join("\n");
  }, [code, language, allDiagnostics]);

  // sinkronkan scroll pre dan nomor baris dengan textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  // cari kecocokan teks saat query pencarian berubah
  React.useEffect(() => {
    if (!findQuery || !showFind) {
      setFindMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const matches: number[] = [];
    const lowerCode = code.toLowerCase();
    const lowerQuery = findQuery.toLowerCase();
    let pos = 0;
    while ((pos = lowerCode.indexOf(lowerQuery, pos)) !== -1) {
      matches.push(pos);
      pos += lowerQuery.length;
    }
    setFindMatches(matches);
    setCurrentMatchIndex(0);

    if (matches.length > 0 && textareaRef.current) {
      const matchPos = matches[0];
      textareaRef.current.focus();
      textareaRef.current.selectionStart = matchPos;
      textareaRef.current.selectionEnd = matchPos + findQuery.length;
    }
  }, [findQuery, code, showFind]);

  // navigasi ke kecocokan pencarian berikutnya
  const handleNextFindMatch = React.useCallback(() => {
    if (findMatches.length === 0 || !textareaRef.current) return;
    const nextIdx = (currentMatchIndex + 1) % findMatches.length;
    setCurrentMatchIndex(nextIdx);
    const pos = findMatches[nextIdx];
    textareaRef.current.focus();
    textareaRef.current.selectionStart = pos;
    textareaRef.current.selectionEnd = pos + findQuery.length;
  }, [findMatches, currentMatchIndex, findQuery.length]);

  // navigasi ke kecocokan pencarian sebelumnya
  const handlePrevFindMatch = React.useCallback(() => {
    if (findMatches.length === 0 || !textareaRef.current) return;
    const prevIdx = (currentMatchIndex - 1 + findMatches.length) % findMatches.length;
    setCurrentMatchIndex(prevIdx);
    const pos = findMatches[prevIdx];
    textareaRef.current.focus();
    textareaRef.current.selectionStart = pos;
    textareaRef.current.selectionEnd = pos + findQuery.length;
  }, [findMatches, currentMatchIndex, findQuery.length]);

  // tutup bilah pencarian dan kembalikan fokus ke editor
  const handleCloseFind = React.useCallback(() => {
    setShowFind(false);
    setShowReplace(false);
    setFindQuery("");
    setReplaceQuery("");
    setFindMatches([]);
    textareaRef.current?.focus();
  }, []);

  // fungsi utilitas untuk memperbarui kode sekaligus menyetel posisi kursor secara presisi
  const updateCodeAndSelection = React.useCallback(
    (newCode: string, selStart: number, selEnd: number = selStart) => {
      const clampedStart = Math.max(0, Math.min(newCode.length, selStart));
      const clampedEnd = Math.max(0, Math.min(newCode.length, selEnd));
      pendingSelectionRef.current = { start: clampedStart, end: clampedEnd };
      recordHistory(newCode, clampedStart, clampedEnd);
      setCode(newCode);
      onChange?.(newCode);
    },
    [recordHistory, onChange]
  );

  // ganti satu kecocokan teks aktif
  const handleReplaceOne = React.useCallback(() => {
    if (findMatches.length === 0 || !findQuery) return;
    const matchPos = findMatches[currentMatchIndex];
    const newCode = code.slice(0, matchPos) + replaceQuery + code.slice(matchPos + findQuery.length);
    updateCodeAndSelection(newCode, matchPos + replaceQuery.length, matchPos + replaceQuery.length);
  }, [findMatches, currentMatchIndex, findQuery, replaceQuery, code, updateCodeAndSelection]);

  // ganti seluruh kecocokan teks sekaligus
  const handleReplaceAll = React.useCallback(() => {
    if (!findQuery) return;
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const newCode = code.replace(regex, replaceQuery);
    updateCodeAndSelection(newCode, 0, 0);
  }, [findQuery, replaceQuery, code, updateCodeAndSelection]);

  // toggle komentar baris ctrl slash
  const handleToggleLineComment = React.useCallback(() => {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const isSingle = start === end;
    const { lineStart, lineEnd } = getLineBounds(code, start, end);
    const block = code.slice(lineStart, lineEnd);
    const lines = block.split("\n");

    const lowerLang = (language || "").toLowerCase();
    const commentPrefix = lowerLang.includes("python") || lowerLang === "py" ? "# " : "// ";
    const trimmedPrefix = commentPrefix.trim();

    // periksa apakah seluruh baris yang berisi teks sudah diawali komentar
    const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
    const allCommented =
      nonEmptyLines.length > 0 &&
      nonEmptyLines.every((l) => l.trim().startsWith(trimmedPrefix));

    let newLines: string[];
    if (allCommented) {
      // batalkan komentar
      newLines = lines.map((l) => {
        const match = l.match(new RegExp(`^(\\s*)${trimmedPrefix} ?`));
        if (match) {
          return l.slice(0, match[1].length) + l.slice(match[0].length);
        }
        return l;
      });
    } else {
      // tambahkan komentar pada baris
      let minIndent = Infinity;
      lines.forEach((l) => {
        if (l.trim().length > 0) {
          const indentLen = (l.match(/^\s*/)?.[0] || "").length;
          if (indentLen < minIndent) minIndent = indentLen;
        }
      });
      if (minIndent === Infinity) minIndent = 0;

      newLines = lines.map((l) => {
        if (l.trim().length === 0) return l;
        const leading = l.slice(0, minIndent);
        const rest = l.slice(minIndent);
        return leading + commentPrefix + rest;
      });
    }

    const newBlock = newLines.join("\n");
    const newCode = code.slice(0, lineStart) + newBlock + code.slice(lineEnd);

    if (isSingle) {
      // jika satu kursor pertahankan posisi kursor relatif tanpa menyeleksi baris penuh
      const diff = newBlock.length - block.length;
      const newCursor = Math.max(lineStart, Math.min(lineStart + newBlock.length, start + diff));
      updateCodeAndSelection(newCode, newCursor, newCursor);
    } else {
      // jika seleksi multi baris pertahankan seluruh blok baris terseleksi
      updateCodeAndSelection(newCode, lineStart, lineStart + newBlock.length);
    }
  }, [code, language, updateCodeAndSelection]);

  // toggle komentar blok shift alt a
  const handleToggleBlockComment = React.useCallback(() => {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    const lowerLang = (language || "").toLowerCase();
    const isPy = lowerLang.includes("python") || lowerLang === "py";

    if (start === end) {
      // jika tanpa seleksi sisipkan komentar blok dan posisikan kursor di tengah
      if (isPy) {
        const insertText = '"""\n\n"""';
        const newCode = code.slice(0, start) + insertText + code.slice(end);
        updateCodeAndSelection(newCode, start + 4, start + 4);
      } else {
        const insertText = "/*  */";
        const newCode = code.slice(0, start) + insertText + code.slice(end);
        updateCodeAndSelection(newCode, start + 3, start + 3);
      }
      return;
    }

    const selected = code.slice(start, end);
    if (isPy) {
      if (selected.startsWith('"""') && selected.endsWith('"""')) {
        const unwrapped = selected.slice(3, -3);
        const newCode = code.slice(0, start) + unwrapped + code.slice(end);
        updateCodeAndSelection(newCode, start, start + unwrapped.length);
        return;
      }
      const wrapped = '"""\n' + selected + '\n"""';
      const newCode = code.slice(0, start) + wrapped + code.slice(end);
      updateCodeAndSelection(newCode, start, start + wrapped.length);
    } else {
      if (selected.startsWith("/*") && selected.endsWith("*/")) {
        let unwrapped = selected.slice(2, -2);
        if (unwrapped.startsWith(" ")) unwrapped = unwrapped.slice(1);
        if (unwrapped.endsWith(" ")) unwrapped = unwrapped.slice(0, -1);
        const newCode = code.slice(0, start) + unwrapped + code.slice(end);
        updateCodeAndSelection(newCode, start, start + unwrapped.length);
        return;
      }
      const wrapped = "/* " + selected + " */";
      const newCode = code.slice(0, start) + wrapped + code.slice(end);
      updateCodeAndSelection(newCode, start, start + wrapped.length);
    }
  }, [code, language, updateCodeAndSelection]);

  // tangani indentasi dan outdentasi tab shift tab ctrl kurung siku
  const handleIndent = React.useCallback(
    (isOutdent: boolean, isTabKey: boolean) => {
      const target = textareaRef.current;
      if (!target) return;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const isSingle = start === end;

      // jika tombol tab biasa ditekan tanpa seleksi sisipkan empat spasi
      if (isTabKey && isSingle && !isOutdent) {
        const newCode = code.substring(0, start) + "    " + code.substring(end);
        updateCodeAndSelection(newCode, start + 4, start + 4);
        return;
      }

      const { lineStart, lineEnd } = getLineBounds(code, start, end);
      const block = code.slice(lineStart, lineEnd);
      const lines = block.split("\n");

      let removedSpacesFirstLine = 0;
      let newLines: string[];

      if (isOutdent) {
        newLines = lines.map((l, idx) => {
          const match = l.match(/^ {1,4}/);
          if (match) {
            if (idx === 0) removedSpacesFirstLine = match[0].length;
            return l.slice(match[0].length);
          }
          return l;
        });
      } else {
        newLines = lines.map((l) => "    " + l);
      }

      const newBlock = newLines.join("\n");
      const newCode = code.slice(0, lineStart) + newBlock + code.slice(lineEnd);

      if (isSingle) {
        const diff = isOutdent ? -removedSpacesFirstLine : 4;
        const newCursor = Math.max(lineStart, Math.min(lineStart + newBlock.length, start + diff));
        updateCodeAndSelection(newCode, newCursor, newCursor);
      } else {
        updateCodeAndSelection(newCode, lineStart, lineStart + newBlock.length);
      }
    },
    [code, updateCodeAndSelection]
  );

  // salin kode ke clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback jika clipboard api ditolak browser
    }
  };

  // bersihkan dan kembalikan terminal ke kondisi standby
  const handleClearTerminal = React.useCallback(() => {
    setTerminalEntries([]);
    setIsAwaitingInput(false);
    setTerminalInput("");
    setPendingSteps([]);
    setCurrentStepIdx(0);
    setCollectedInputs([]);
    setStatus("idle");
    setOutput(null);
  }, []);

  // reset kode ke kerangka awal
  const handleResetCode = () => {
    setCode(initialCode);
    handleClearTerminal();
    recordHistory(initialCode, 0, 0);
  };

  // jalankan kode melalui terminal konsol interaktif
  const handleRunCode = React.useCallback(async () => {
    if (!code.trim() || isRunning) return;

    setCompilerDiagnostics([]);
    setStatus("running");
    setIsRunning(true);
    setIsAwaitingInput(false);
    setTerminalInput("");
    setDuration(null);

    const commandEntry: TerminalEntry = {
      id: `cmd-${Date.now()}`,
      text: "$ ./main",
      type: "cmd",
    };

    // periksa diagnostik sintaks lokal sebelum kompilasi
    if (allDiagnostics.length > 0) {
      const firstErr = allDiagnostics[0];
      const errorEntry: TerminalEntry = {
        id: `err-${Date.now()}`,
        text: `main.cpp:${firstErr.line}: error: ${firstErr.message}`,
        type: "err",
      };
      const sysEntry: TerminalEntry = {
        id: `sys-${Date.now()}`,
        text: "\n[Kompilasi dibatalkan karena kesalahan sintaks]",
        type: "sys",
      };
      setTerminalEntries([commandEntry, errorEntry, sysEntry]);
      setStatus("error");
      setIsRunning(false);
      return;
    }

    // analisis apakah program membutuhkan masukan pengguna cin atau input
    const steps = parseInteractiveSteps(code, language);

    if (steps.length > 0) {
      // program membutuhkan masukan pengguna secara interaktif
      setPendingSteps(steps);
      setCurrentStepIdx(0);
      setCollectedInputs([]);

      const step = steps[0];
      const initialEntries: TerminalEntry[] = [commandEntry];

      if (step.promptOutput) {
        initialEntries.push({
          id: `prompt-${Date.now()}`,
          text: step.promptOutput,
          type: "out",
        });
      }

      setTerminalEntries(initialEntries);
      setIsAwaitingInput(true);
      setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 50);
      return;
    }

    // program berjalan langsung tanpa masukan pengguna
    setTerminalEntries([commandEntry]);

    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          stdin: "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengeksekusi kode program");
      }

      const isSuccess = Boolean(data.success);
      setDuration(data.duration || null);
      setStatus(isSuccess ? "success" : "error");

      const outEntry: TerminalEntry = {
        id: `out-${Date.now()}`,
        text: data.output || "Program berhasil dijalankan tanpa output.",
        type: isSuccess ? "out" : "err",
      };

      const sysEntry: TerminalEntry = {
        id: `sys-${Date.now()}`,
        text: `\n[Program selesai dieksekusi dengan kode keluar ${data.exitCode ?? (isSuccess ? 0 : 1)}]`,
        type: "sys",
      };

      setTerminalEntries([commandEntry, outEntry, sysEntry]);

      if (!isSuccess && data.output) {
        setCompilerDiagnostics(parseCompilerErrors(data.output));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan kompilasi";
      setTerminalEntries([
        commandEntry,
        { id: `err-${Date.now()}`, text: `Error: ${errMsg}`, type: "err" },
        { id: `sys-${Date.now()}`, text: "\n[Eksekusi program gagal]", type: "sys" },
      ]);
      setStatus("error");
    } finally {
      setIsRunning(false);
    }
  }, [code, isRunning, language, allDiagnostics]);

  // kirim masukan interaktif saat pengguna menekan tombol enter di terminal
  const handleTerminalSubmit = React.useCallback(
    async (inputValue: string) => {
      if (!isAwaitingInput) return;

      const val = inputValue;
      const newCollected = [...collectedInputs, val];
      setCollectedInputs(newCollected);
      setTerminalInput("");

      // catat masukan yang diketik pengguna ke baris konsol
      const inputEntry: TerminalEntry = {
        id: `in-${Date.now()}`,
        text: val,
        type: "out",
      };

      const updatedEntries = [...terminalEntries, inputEntry];

      // periksa apakah masih ada langkah masukan berikutnya
      const nextIdx = currentStepIdx + 1;
      if (nextIdx < pendingSteps.length) {
        setCurrentStepIdx(nextIdx);
        const nextStep = pendingSteps[nextIdx];

        if (nextStep.promptOutput) {
          updatedEntries.push({
            id: `prompt-${Date.now()}`,
            text: nextStep.promptOutput,
            type: "out",
          });
        }

        setTerminalEntries(updatedEntries);
        setTimeout(() => {
          terminalInputRef.current?.focus();
        }, 50);
        return;
      }

      // seluruh masukan telah terpenuhi selesaikan eksekusi program di server
      setIsAwaitingInput(false);
      const fullStdin = newCollected.join("\n") + "\n";

      updatedEntries.push({
        id: `sys-running-${Date.now()}`,
        text: "\n[Menyelesaikan eksekusi program...]",
        type: "sys",
      });
      setTerminalEntries(updatedEntries);

      try {
        const res = await fetch("/api/code/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            code,
            stdin: fullStdin,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal mengeksekusi program");
        }

        const isSuccess = Boolean(data.success);
        setDuration(data.duration || null);
        setStatus(isSuccess ? "success" : "error");

        // ekstrak hasil akhir tanpa menduplikasi prompt awal yang sudah tampil di konsol
        const cleanFinalOutput = extractFinalProgramOutput(data.output || "", pendingSteps);
        const finalEntries = updatedEntries.filter((e) => !e.id.startsWith("sys-running-"));

        if (cleanFinalOutput.trim()) {
          finalEntries.push({
            id: `out-final-${Date.now()}`,
            text: cleanFinalOutput,
            type: isSuccess ? "out" : "err",
          });
        }

        finalEntries.push({
          id: `sys-done-${Date.now()}`,
          text: `\n[Program selesai dieksekusi dengan kode keluar ${data.exitCode ?? (isSuccess ? 0 : 1)}]`,
          type: "sys",
        });

        setTerminalEntries(finalEntries);

        if (!isSuccess && data.output) {
          setCompilerDiagnostics(parseCompilerErrors(data.output));
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
        setTerminalEntries([
          ...updatedEntries.filter((e) => !e.id.startsWith("sys-running-")),
          { id: `err-${Date.now()}`, text: `Error: ${errMsg}`, type: "err" },
          { id: `sys-${Date.now()}`, text: "\n[Eksekusi program gagal]", type: "sys" },
        ]);
        setStatus("error");
      } finally {
        setIsRunning(false);
      }
    },
    [isAwaitingInput, collectedInputs, terminalEntries, currentStepIdx, pendingSteps, code, language]
  );

  // tangani seluruh pintasan keyboard editor secara komprehensif
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    // 1 f5 atau ctrl enter untuk langsung mengeksekusi kode program
    if ((ctrlOrCmd && e.key === "Enter") || e.key === "F5") {
      e.preventDefault();
      handleRunCode();
      return;
    }

    // 2 ctrl s untuk menyimpan kode dan mencegah dialog peramban
    if (ctrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S" || e.code === "KeyS")) {
      e.preventDefault();
      recordHistory(code, start, end);
      setSavedTooltip(true);
      setTimeout(() => setSavedTooltip(false), 1500);
      return;
    }

    // 3 ctrl shift enter untuk menyisipkan baris baru di atas baris saat ini
    if (ctrlOrCmd && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      const { lineStart } = getLineBounds(code, start, end);
      const currentLineText = code.slice(lineStart, start);
      const leadingIndent = currentLineText.match(/^\s*/)?.[0] || "";
      const insertText = leadingIndent + "\n";
      const newCode = code.slice(0, lineStart) + insertText + code.slice(lineStart);
      const newPos = lineStart + leadingIndent.length;
      updateCodeAndSelection(newCode, newPos, newPos);
      return;
    }

    // 4 shift enter untuk membuat baris baru di bawah baris saat ini tanpa memotong teks
    if (!ctrlOrCmd && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      const { lineStart, lineEnd } = getLineBounds(code, start, end);
      const lineText = code.slice(lineStart, lineEnd);
      const leadingIndent = lineText.match(/^\s*/)?.[0] || "";
      const insertText = "\n" + leadingIndent;
      const newCode = code.slice(0, lineEnd) + insertText + code.slice(lineEnd);
      const newPos = lineEnd + insertText.length;
      updateCodeAndSelection(newCode, newPos, newPos);
      return;
    }

    // 5 ctrl f untuk membuka bilah pencarian teks
    if (ctrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "f" || e.key === "F" || e.code === "KeyF")) {
      e.preventDefault();
      setShowFind(true);
      setShowReplace(false);
      if (start !== end) {
        setFindQuery(code.slice(start, end));
      }
      setTimeout(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }, 50);
      return;
    }

    // 6 ctrl h untuk membuka bilah pencarian dan penggantian teks
    if (ctrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "h" || e.key === "H" || e.code === "KeyH")) {
      e.preventDefault();
      setShowFind(true);
      setShowReplace(true);
      if (start !== end) {
        setFindQuery(code.slice(start, end));
      }
      setTimeout(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }, 50);
      return;
    }

    // 7 escape untuk menutup bilah pencarian teks atau keluar dari mode layar penuh
    if (e.key === "Escape") {
      if (showFind) {
        e.preventDefault();
        handleCloseFind();
        return;
      }
      if (isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }
    }

    // 8 ctrl d untuk memilih kata di bawah kursor atau melompat ke kecocokan berikutnya
    if (ctrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "d" || e.key === "D" || e.code === "KeyD")) {
      e.preventDefault();
      if (start === end) {
        let wordStart = start;
        while (wordStart > 0 && /[a-zA-Z0-9_]/.test(code[wordStart - 1])) {
          wordStart--;
        }
        let wordEnd = end;
        while (wordEnd < code.length && /[a-zA-Z0-9_]/.test(code[wordEnd])) {
          wordEnd++;
        }
        if (wordStart < wordEnd) {
          target.setSelectionRange(wordStart, wordEnd);
          pendingSelectionRef.current = { start: wordStart, end: wordEnd };
        }
      } else {
        const selected = code.slice(start, end);
        let nextPos = code.indexOf(selected, end);
        if (nextPos === -1) {
          nextPos = code.indexOf(selected, 0);
        }
        if (nextPos !== -1) {
          target.setSelectionRange(nextPos, nextPos + selected.length);
          pendingSelectionRef.current = { start: nextPos, end: nextPos + selected.length };
        }
      }
      return;
    }

    // 9 ctrl z untuk undo riwayat pengetikan
    if (ctrlOrCmd && !e.shiftKey && (e.key === "z" || e.key === "Z" || e.code === "KeyZ")) {
      e.preventDefault();
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        const item = historyRef.current[historyIndexRef.current];
        isUndoRedoActionRef.current = true;
        pendingSelectionRef.current = { start: item.start, end: item.end };
        setCode(item.code);
        setTimeout(() => {
          isUndoRedoActionRef.current = false;
        }, 50);
      }
      return;
    }

    // 10 ctrl y atau ctrl shift z untuk redo riwayat pengetikan
    if (
      (ctrlOrCmd && (e.key === "y" || e.key === "Y" || e.code === "KeyY")) ||
      (ctrlOrCmd && e.shiftKey && (e.key === "z" || e.key === "Z" || e.code === "KeyZ"))
    ) {
      e.preventDefault();
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current += 1;
        const item = historyRef.current[historyIndexRef.current];
        isUndoRedoActionRef.current = true;
        pendingSelectionRef.current = { start: item.start, end: item.end };
        setCode(item.code);
        setTimeout(() => {
          isUndoRedoActionRef.current = false;
        }, 50);
      }
      return;
    }

    // 11 ctrl l untuk menyeleksi seluruh baris saat ini
    if (ctrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "l" || e.key === "L" || e.code === "KeyL")) {
      e.preventDefault();
      const { lineStart, lineEnd } = getLineBounds(code, start, end);
      const nextPos = lineEnd < code.length && code[lineEnd] === "\n" ? lineEnd + 1 : lineEnd;
      target.setSelectionRange(lineStart, nextPos);
      pendingSelectionRef.current = { start: lineStart, end: nextPos };
      return;
    }

    // 12 shift alt panah bawah untuk menduplikasi baris ke bawah
    if (e.shiftKey && e.altKey && (e.key === "ArrowDown" || e.code === "ArrowDown")) {
      e.preventDefault();
      const { lineStart, lineEnd } = getLineBounds(code, start, end);
      const block = code.slice(lineStart, lineEnd);
      const newCode = code.slice(0, lineEnd) + "\n" + block + code.slice(lineEnd);
      const offset = block.length + 1;
      updateCodeAndSelection(newCode, start + offset, end + offset);
      return;
    }

    // 13 shift alt panah atas untuk menduplikasi baris ke atas
    if (e.shiftKey && e.altKey && (e.key === "ArrowUp" || e.code === "ArrowUp")) {
      e.preventDefault();
      const { lineStart, lineEnd } = getLineBounds(code, start, end);
      const block = code.slice(lineStart, lineEnd);
      const newCode = code.slice(0, lineStart) + block + "\n" + code.slice(lineStart);
      updateCodeAndSelection(newCode, start, end);
      return;
    }

    // 14 alt panah bawah untuk memindahkan baris ke bawah
    if (!e.shiftKey && e.altKey && (e.key === "ArrowDown" || e.code === "ArrowDown")) {
      e.preventDefault();
      const { lineStart, lineEnd } = getLineBounds(code, start, end);
      if (lineEnd >= code.length) return;

      let nextLineEnd = code.indexOf("\n", lineEnd + 1);
      if (nextLineEnd === -1) nextLineEnd = code.length;

      const block = code.slice(lineStart, lineEnd);
      const nextLine = code.slice(lineEnd + 1, nextLineEnd);

      const newCode =
        code.slice(0, lineStart) + nextLine + "\n" + block + code.slice(nextLineEnd);
      const offset = nextLine.length + 1;
      updateCodeAndSelection(newCode, start + offset, end + offset);
      return;
    }

    // 15 alt panah atas untuk memindahkan baris ke atas
    if (!e.shiftKey && e.altKey && (e.key === "ArrowUp" || e.code === "ArrowUp")) {
      e.preventDefault();
      const { lineStart, lineEnd } = getLineBounds(code, start, end);
      if (lineStart <= 0) return;

      let prevLineStart = code.lastIndexOf("\n", lineStart - 2);
      prevLineStart = prevLineStart === -1 ? 0 : prevLineStart + 1;

      const prevLine = code.slice(prevLineStart, lineStart - 1);
      const block = code.slice(lineStart, lineEnd);

      const newCode =
        code.slice(0, prevLineStart) + block + "\n" + prevLine + code.slice(lineEnd);
      const offset = prevLine.length + 1;
      updateCodeAndSelection(newCode, start - offset, end - offset);
      return;
    }

    // 16 ctrl shift k untuk menghapus seluruh baris saat ini secara instan
    if (ctrlOrCmd && e.shiftKey && (e.key === "k" || e.key === "K" || e.code === "KeyK")) {
      e.preventDefault();
      const { lineStart, lineEnd } = getLineBounds(code, start, end);
      let newCode = "";
      if (lineEnd < code.length && code[lineEnd] === "\n") {
        newCode = code.slice(0, lineStart) + code.slice(lineEnd + 1);
      } else if (lineStart > 0 && code[lineStart - 1] === "\n") {
        newCode = code.slice(0, lineStart - 1) + code.slice(lineEnd);
      } else {
        newCode = "";
      }
      const nextPos = Math.max(0, Math.min(newCode.length, lineStart));
      updateCodeAndSelection(newCode, nextPos, nextPos);
      return;
    }

    // 17 ctrl slash untuk toggle komentar baris
    const isSlashKey =
      e.key === "/" ||
      e.code === "Slash" ||
      (e as any).keyCode === 191 ||
      (e as any).which === 191;
    if (ctrlOrCmd && !e.altKey && isSlashKey) {
      e.preventDefault();
      handleToggleLineComment();
      return;
    }

    // 18 shift alt a untuk toggle komentar blok multi baris
    if (e.shiftKey && e.altKey && (e.key === "a" || e.key === "A" || e.code === "KeyA")) {
      e.preventDefault();
      handleToggleBlockComment();
      return;
    }

    // 19 ctrl c atau ctrl x tanpa seleksi untuk menyalin atau memotong seluruh baris
    if (ctrlOrCmd && start === end) {
      if (e.key === "c" || e.key === "C" || e.code === "KeyC") {
        const { lineStart, lineEnd } = getLineBounds(code, start, end);
        const lineText = code.slice(lineStart, lineEnd);
        navigator.clipboard?.writeText(lineText + "\n").catch(() => {});
        return;
      }
      if (e.key === "x" || e.key === "X" || e.code === "KeyX") {
        e.preventDefault();
        const { lineStart, lineEnd } = getLineBounds(code, start, end);
        const lineText = code.slice(lineStart, lineEnd);
        navigator.clipboard?.writeText(lineText + "\n").catch(() => {});
        let newCode = "";
        if (lineEnd < code.length && code[lineEnd] === "\n") {
          newCode = code.slice(0, lineStart) + code.slice(lineEnd + 1);
        } else if (lineStart > 0 && code[lineStart - 1] === "\n") {
          newCode = code.slice(0, lineStart - 1) + code.slice(lineEnd);
        } else {
          newCode = "";
        }
        const nextPos = Math.max(0, Math.min(newCode.length, lineStart));
        updateCodeAndSelection(newCode, nextPos, nextPos);
        return;
      }
    }

    // 20 tab dan shift tab untuk indentasi dan outdentasi kode
    if (e.key === "Tab") {
      e.preventDefault();
      handleIndent(e.shiftKey, true);
      return;
    }

    // 21 ctrl kurung siku untuk indent dan outdent baris
    if (ctrlOrCmd && (e.key === "[" || e.key === "]")) {
      e.preventDefault();
      handleIndent(e.key === "[", false);
      return;
    }

    // 22 pasangan otomatis tanda kurung kurawal siku dan tanda petik
    const bracketPairs: Record<string, string> = {
      "{": "}",
      "(": ")",
      "[": "]",
      '"': '"',
      "'": "'",
      "`": "`",
    };

    if (bracketPairs[e.key]) {
      const openChar = e.key;
      const closeChar = bracketPairs[openChar];

      // jika ada teks terseleksi bungkus teks dengan pasangan kurung atau petik
      if (start !== end) {
        e.preventDefault();
        const selected = code.slice(start, end);
        const newCode = code.slice(0, start) + openChar + selected + closeChar + code.slice(end);
        updateCodeAndSelection(newCode, start + 1, end + 1);
        return;
      }

      // jika petik dan karakter tepat di depan kursor sudah sama lewati karakter
      if ((openChar === '"' || openChar === "'" || openChar === "`") && code[start] === openChar) {
        e.preventDefault();
        target.setSelectionRange(start + 1, start + 1);
        pendingSelectionRef.current = { start: start + 1, end: start + 1 };
        return;
      }

      // sisipkan pasangan tanda kurung dan letakkan kursor tepat di tengah
      e.preventDefault();
      const newCode = code.slice(0, start) + openChar + closeChar + code.slice(end);
      updateCodeAndSelection(newCode, start + 1, start + 1);
      return;
    }

    // 23 lewati karakter penutup jika karakter setelah kursor sudah sama
    if (e.key === "}" || e.key === ")" || e.key === "]") {
      if (start === end && code[start] === e.key) {
        e.preventDefault();
        target.setSelectionRange(start + 1, start + 1);
        pendingSelectionRef.current = { start: start + 1, end: start + 1 };
        return;
      }
    }

    // 24 smart backspace untuk menghapus sepasang tanda kurung kosong
    if (e.key === "Backspace" && start === end && start > 0 && start < code.length) {
      const prevChar = code[start - 1];
      const nextChar = code[start];
      const matchPair =
        (prevChar === "{" && nextChar === "}") ||
        (prevChar === "(" && nextChar === ")") ||
        (prevChar === "[" && nextChar === "]") ||
        (prevChar === '"' && nextChar === '"') ||
        (prevChar === "'" && nextChar === "'") ||
        (prevChar === "`" && nextChar === "`");

      if (matchPair) {
        e.preventDefault();
        const newCode = code.slice(0, start - 1) + code.slice(start + 1);
        updateCodeAndSelection(newCode, start - 1, start - 1);
        return;
      }
    }

    // 25 smart enter untuk indentasi otomatis dan pemecahan kurung kurawal
    if (e.key === "Enter" && !ctrlOrCmd && !e.shiftKey) {
      const { lineStart } = getLineBounds(code, start, end);
      const lineText = code.slice(lineStart, start);
      const leadingIndent = lineText.match(/^\s*/)?.[0] || "";

      // jika menekan enter tepat di antara kurung kurawal buka dan tutup
      if (start === end && code[start - 1] === "{" && code[start] === "}") {
        e.preventDefault();
        const extraIndent = "    ";
        const newCode =
          code.slice(0, start) +
          "\n" +
          leadingIndent +
          extraIndent +
          "\n" +
          leadingIndent +
          code.slice(end);
        const newCursor = start + 1 + leadingIndent.length + extraIndent.length;
        updateCodeAndSelection(newCode, newCursor, newCursor);
        return;
      }

      // jika baris diakhiri kurung kurawal buka tambah empat spasi indentasi
      if (lineText.trim().endsWith("{")) {
        e.preventDefault();
        const extraIndent = "    ";
        const insertText = "\n" + leadingIndent + extraIndent;
        const newCode = code.slice(0, start) + insertText + code.slice(end);
        const newCursor = start + insertText.length;
        updateCodeAndSelection(newCode, newCursor, newCursor);
        return;
      }

      // teruskan indentasi baris sebelumnya
      if (leadingIndent.length > 0 && start === end) {
        e.preventDefault();
        const insertText = "\n" + leadingIndent;
        const newCode = code.slice(0, start) + insertText + code.slice(end);
        const newCursor = start + insertText.length;
        updateCodeAndSelection(newCode, newCursor, newCursor);
        return;
      }
    }
  };

  // tangani shortcut level kontainer editor untuk eksekusi kode f5 atau ctrl enter dari mana saja
  const handleContainerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    if ((ctrlOrCmd && e.key === "Enter") || e.key === "F5") {
      e.preventDefault();
      handleRunCode();
      return;
    }

    if (e.key === "Escape" && isFullscreen && !showFind && !showShortcutsModal) {
      e.preventDefault();
      setIsFullscreen(false);
    }
  };

  // tentukan nama berkas default sesuai bahasa
  const defaultFileName = React.useMemo(() => {
    if (fileName) return fileName;
    const lower = language.toLowerCase();
    if (lower.includes("python") || lower === "py") return "main.py";
    if (lower.includes("web") || lower === "html") return "index.html";
    if (lower.includes("js") || lower === "javascript") return "index.js";
    return "main.cpp";
  }, [fileName, language]);

  const isCodeModified = code !== initialCode;

  const editorContent = (
    <div
      onKeyDown={handleContainerKeyDown}
      tabIndex={-1}
      className={
        isFullscreen
          ? "fixed inset-0 z-[99999] bg-[#1e1e1e] text-[#d4d4d4] flex flex-col font-sans focus:outline-none w-screen h-screen m-0 p-0 rounded-none overflow-hidden"
          : "w-full rounded-2xl bg-[#1e1e1e] border border-[#2d2d2d] text-[#d4d4d4] shadow-2xl overflow-hidden flex flex-col font-sans focus:outline-none"
      }
    >
      {/* header toolbar editor bergaya vscode */}
      <div className="bg-[#252526] border-b border-[#333333] flex flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-4">
        {/* tab file aktif vscode */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-[#1e1e1e] border-t border-x border-[#333333] text-stone-200 text-xs font-medium shadow-2xs">
            <FileCode className="w-4 h-4 text-[#4ec9b0]" />
            <span>{defaultFileName}</span>
            {allDiagnostics.length > 0 ? (
              <span
                title={`${allDiagnostics.length} masalah sintaks terdeteksi`}
                className="w-2 h-2 rounded-full bg-[#f14c4c] ml-1 animate-pulse"
              />
            ) : isCodeModified ? (
              <span
                title="Kode telah dimodifikasi (siap dijalankan)"
                className="w-2 h-2 rounded-full bg-emerald-400 ml-1"
              />
            ) : null}
          </div>

          {allDiagnostics.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToLine(allDiagnostics[0].line)}
              title={allDiagnostics[0].message}
              className="px-2 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[11px] flex items-center gap-1.5 hover:bg-rose-500/25 transition-colors cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{allDiagnostics.length} Error</span>
            </button>
          )}

          {codeNeedsInput && (
            <span
              title="Program ini membaca input pengguna dengan cin atau input"
              className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md"
            >
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>Input (cin) Aktif</span>
            </span>
          )}

          {savedTooltip && (
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md animate-in fade-in duration-100">
              Tersimpan
            </span>
          )}

          <span className="hidden md:inline text-xs text-stone-400 font-medium pl-2 truncate">
            {title}
          </span>
        </div>

        {/* tombol aksi editor */}
        <div className="flex items-center gap-2 shrink-0">
          {/* tombol layar penuh halaman */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Kembalikan ke ukuran normal (Esc)" : "Layar penuh halaman"}
            className="p-1.5 px-2.5 rounded-xl border border-[#3c3c3c] bg-[#2d2d2d] hover:bg-[#383838] text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Perkecil</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden sm:inline">Layar Penuh</span>
              </>
            )}
          </button>

          {/* tombol panduan pintasan vscode */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            title="Lihat pintasan keyboard lengkap (Shortcuts)"
            className="p-1.5 px-2.5 rounded-xl border border-[#3c3c3c] bg-[#2d2d2d] hover:bg-[#383838] text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden sm:inline">Pintasan</span>
          </button>

          <button
            type="button"
            onClick={handleResetCode}
            title="Kembalikan kode ke kerangka awal"
            className="p-1.5 px-2.5 rounded-xl border border-[#3c3c3c] bg-[#2d2d2d] hover:bg-[#383838] text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            title="Salin kode ke papan klip"
            className="p-1.5 px-2.5 rounded-xl border border-[#3c3c3c] bg-[#2d2d2d] hover:bg-[#383838] text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{copied ? "Tersalin" : "Salin"}</span>
          </button>

          <Button
            size="sm"
            type="button"
            disabled={isRunning}
            onClick={() => handleRunCode()}
            className="bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
            )}
            <span>{isRunning ? "Menjalankan..." : "Jalankan Kode"}</span>
          </Button>
        </div>
      </div>

      {/* area pengetikan kode dengan penomoran baris dan penyorot sintaks bertema vscode dark+ */}
      <div
        className={`relative flex items-stretch bg-[#1e1e1e] ${
          isFullscreen ? "flex-1 min-h-[300px] overflow-hidden" : "min-h-[320px] max-h-[520px]"
        }`}
      >
        {/* gaya css untuk garis bawah bergelombang merah tanda error vscode */}
        <style>{`
          .vscode-squiggly-error {
            text-decoration-line: underline !important;
            text-decoration-style: wavy !important;
            text-decoration-color: #f14c4c !important;
            text-decoration-thickness: 1.5px !important;
            text-underline-offset: 3px !important;
            background-color: rgba(241, 76, 76, 0.16) !important;
            border-radius: 2px !important;
          }
        `}</style>

        {/* kolom nomor baris gutter vscode */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="select-none py-4 px-2 text-right font-mono text-xs text-[#858585] bg-[#1e1e1e] border-r border-[#2d2d2d] overflow-hidden shrink-0"
          style={{
            width: `${Math.max(44, String(lineCount).length * 10 + 24)}px`,
            lineHeight: "22px",
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = i + 1;
            const diag = allDiagnostics.find((d) => d.line === lineNum);
            return (
              <div
                key={lineNum}
                onClick={() => diag && scrollToLine(lineNum)}
                title={diag ? `Baris ${lineNum}: ${diag.message}` : undefined}
                className={`relative flex items-center justify-end pr-1.5 transition-colors ${
                  diag
                    ? "text-[#f14c4c] font-bold bg-[#f14c4c]/15 cursor-pointer"
                    : "hover:text-stone-400"
                }`}
                style={{ height: "22px", lineHeight: "22px" }}
              >
                {diag && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f14c4c] mr-1 shrink-0 animate-pulse" />
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* kontainer tumpukan ganda kode tersorot di bawah dan textarea transparan di atas */}
        <div className="relative flex-1 overflow-hidden bg-[#1e1e1e]">
          {/* lapisan kode berwarna sintaks vscode di bawah */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-0 p-4 font-mono text-xs sm:text-sm overflow-hidden whitespace-pre selection:bg-transparent"
            style={{
              fontFamily: 'Consolas, "Courier New", Courier, monospace',
              fontSize: "13px",
              lineHeight: "22px",
              tabSize: 4,
            }}
            dangerouslySetInnerHTML={{
              __html: highlightedHtml + (code.endsWith("\n") ? " " : ""),
            }}
          />

          {/* lapisan textarea transparan tempat pengguna mengetik kode secara langsung */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => {
              const val = e.target.value;
              setCode(val);
              setCompilerDiagnostics([]);
              recordHistory(val, e.target.selectionStart, e.target.selectionEnd);
              onChange?.(val);
            }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 m-0 w-full h-full p-4 bg-transparent font-mono text-xs sm:text-sm text-transparent caret-[#58a6ff] placeholder-stone-600 focus:outline-none resize-none overflow-auto whitespace-pre selection:bg-blue-600/35"
            style={{
              fontFamily: 'Consolas, "Courier New", Courier, monospace',
              fontSize: "13px",
              lineHeight: "22px",
              tabSize: 4,
            }}
            placeholder="// masukkan kode program anda di sini..."
          />

          {/* widget pencarian dan penggantian teks mengambang ctrl f atau ctrl h */}
          {showFind && (
            <div className="absolute top-3 right-4 z-30 flex flex-col gap-1.5 p-2 rounded-xl bg-[#252526] border border-[#3c3c3c] shadow-2xl text-xs text-stone-200 animate-in fade-in zoom-in-95 duration-100 max-w-sm">
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-stone-400 ml-1 shrink-0" />
                <input
                  ref={findInputRef}
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (e.shiftKey) {
                        handlePrevFindMatch();
                      } else {
                        handleNextFindMatch();
                      }
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      handleCloseFind();
                    }
                  }}
                  placeholder="Cari teks..."
                  className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg px-2 py-1 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400 w-36 sm:w-44 font-sans"
                />
                <span className="text-[11px] text-stone-400 px-1 shrink-0 font-medium">
                  {findQuery
                    ? `${findMatches.length > 0 ? currentMatchIndex + 1 : 0}/${findMatches.length}`
                    : "0/0"}
                </span>
                <button
                  type="button"
                  onClick={handlePrevFindMatch}
                  disabled={findMatches.length === 0}
                  title="Kecocokan sebelumnya (Shift+Enter)"
                  className="p-1 rounded-lg hover:bg-[#333333] text-stone-300 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextFindMatch}
                  disabled={findMatches.length === 0}
                  title="Kecocokan berikutnya (Enter)"
                  className="p-1 rounded-lg hover:bg-[#333333] text-stone-300 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowReplace(!showReplace)}
                  title="Alihkan bilah penggantian (Ctrl+H)"
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    showReplace ? "bg-[#0F3E2E] text-emerald-300" : "hover:bg-[#333333] text-stone-400"
                  }`}
                >
                  <Replace className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCloseFind}
                  title="Tutup pencarian (Esc)"
                  className="p-1 rounded-lg hover:bg-[#333333] text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* bilah penggantian teks replace */}
              {showReplace && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-[#333333]">
                  <span className="w-3.5 text-center text-stone-400 text-[10px]">↳</span>
                  <input
                    ref={replaceInputRef}
                    type="text"
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleReplaceOne();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        handleCloseFind();
                      }
                    }}
                    placeholder="Ganti dengan..."
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg px-2 py-1 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-400 w-36 sm:w-44 font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleReplaceOne}
                    disabled={findMatches.length === 0}
                    title="Ganti satu kecocokan saat ini"
                    className="px-2 py-1 rounded-lg bg-[#333333] hover:bg-[#3d3d3d] text-[11px] text-stone-200 font-medium disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Ganti
                  </button>
                  <button
                    type="button"
                    onClick={handleReplaceAll}
                    disabled={findMatches.length === 0}
                    title="Ganti seluruh kecocokan dalam berkas"
                    className="px-2 py-1 rounded-lg bg-[#333333] hover:bg-[#3d3d3d] text-[11px] text-stone-200 font-medium disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Semua
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* bilah status masalah diagnostik ala vscode */}
      {allDiagnostics.length > 0 ? (
        <div className="px-4 py-2 bg-[#251518] border-t border-[#4d1d24] text-xs text-rose-300 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <XCircle className="w-4 h-4 text-[#f14c4c] shrink-0" />
            <span className="font-bold text-rose-400 shrink-0">
              Baris {allDiagnostics[0].line}:
            </span>
            <span
              className="truncate text-rose-200"
              title={allDiagnostics[0].message}
            >
              {allDiagnostics[0].message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => scrollToLine(allDiagnostics[0].line)}
            className="text-[11px] font-semibold text-rose-300 hover:text-white underline shrink-0 cursor-pointer"
          >
            Lompat ke Baris {allDiagnostics[0].line}
          </button>
        </div>
      ) : (
        <div className="px-4 py-1.5 bg-[#1a1a1a] border-t border-[#2d2d2d] text-[11px] text-stone-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-stone-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Tidak ada masalah sintaks terdeteksi</span>
          </span>
          <span className="hidden sm:inline text-stone-500 font-medium">
            UTF-8 • {language.toUpperCase()} • VS Code Dark+
          </span>
        </div>
      )}


      {/* output konsol / terminal di bagian bawah */}
      <div className="border-t border-[#2d2d2d] bg-[#181818] flex flex-col">
        {/* bar status terminal */}
        <div className="px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2d2d2d] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs font-bold text-stone-300">
              TERMINAL
            </span>
            {status === "running" && (
              <Badge
                variant="neutral"
                className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20"
              >
                {isAwaitingInput ? "Menunggu Masukan..." : "Mengeksekusi..."}
              </Badge>
            )}
            {status === "success" && (
              <Badge
                variant="neutral"
                className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              >
                Selesai {duration ? `(${duration}s)` : ""}
              </Badge>
            )}
            {status === "error" && (
              <Badge
                variant="neutral"
                className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/20 flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Error</span>
              </Badge>
            )}
          </div>

          {terminalEntries.length > 0 && (
            <button
              type="button"
              onClick={handleClearTerminal}
              title="Bersihkan output terminal"
              className="text-stone-400 hover:text-stone-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Bersihkan</span>
            </button>
          )}
        </div>

        {/* area tampilan output terminal */}
        <div
          onClick={() => {
            if (isAwaitingInput) {
              terminalInputRef.current?.focus();
            }
          }}
          className="p-4 bg-[#141414] min-h-[140px] max-h-[300px] overflow-y-auto font-mono text-xs leading-relaxed selection:bg-emerald-500/30 flex flex-col justify-start gap-1 cursor-text"
        >
          {terminalEntries.length === 0 ? (
            <div className="text-stone-500 flex flex-col items-start gap-1 py-1">
              <span className="text-stone-400 font-semibold flex items-center gap-2">
                <span className="text-emerald-500 font-bold">$</span>
                <span>Konsol terminal siap.</span>
              </span>
              <span className="text-stone-500 text-[11px]">
                {codeNeedsInput ? (
                  <>
                    Program ini membutuhkan masukan pengguna (<code className="text-emerald-400">cin</code>). Klik{" "}
                    <strong className="text-stone-300 font-semibold">"Jalankan Kode"</strong> untuk memulai eksekusi. Terminal akan langsung meminta masukan saat program berjalan.
                  </>
                ) : (
                  <>
                    Klik <strong className="text-stone-300 font-semibold">"Jalankan Kode"</strong> atau tekan <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700 text-[10px]">Ctrl+Enter</kbd> untuk mengeksekusi program.
                  </>
                )}
              </span>
            </div>
          ) : (
            <>
              {terminalEntries.map((entry) => (
                <pre
                  key={entry.id}
                  className={`whitespace-pre-wrap font-mono m-0 p-0 ${
                    entry.type === "cmd"
                      ? "text-emerald-400 font-bold"
                      : entry.type === "err"
                      ? "text-rose-400"
                      : entry.type === "sys"
                      ? "text-stone-500 text-[11px]"
                      : "text-stone-200"
                  }`}
                >
                  {entry.text}
                </pre>
              ))}

              {/* kursor masukan interaktif hanya muncul saat program sedang berjalan dan meminta input cin */}
              {isAwaitingInput && (
                <div className="flex items-center gap-1.5 mt-0.5 select-none">
                  <span className="text-emerald-400 font-bold shrink-0 animate-pulse">&gt;</span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    autoFocus
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleTerminalSubmit(terminalInput);
                      }
                    }}
                    placeholder="ketik masukan di sini lalu tekan Enter..."
                    className="flex-1 bg-transparent border-none text-emerald-300 font-mono text-xs sm:text-[13px] focus:outline-none placeholder-stone-600 caret-emerald-400 p-0 m-0"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* catatan bantuan atau tips jika tersedia */}
      {tips && (
        <div className="px-4 py-2.5 bg-[#252526] border-t border-[#2d2d2d] text-[11px] text-stone-400 flex items-center gap-2">
          <span className="font-bold text-stone-300 shrink-0">Tips:</span>
          <span className="truncate">{tips}</span>
        </div>
      )}

      {/* modal panduan pintasan keyboard vscode */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#1e1e1e] border border-[#333333] shadow-2xl p-6 text-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-[#333333] pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Pintasan Keyboard VS Code
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Komentar / batal komentar baris</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + /
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Komentar blok (multi-baris)</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Shift + Alt + A
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Cari teks dalam kode</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + F
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Cari & ganti teks (Replace)</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + H
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Pilih kata / kecocokan berikutnya</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + D
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Duplikasi baris ke bawah</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Shift + Alt + ↓
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Duplikasi baris ke atas</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Shift + Alt + ↑
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Pindahkan baris ke bawah / atas</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Alt + ↓ / ↑
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Pilih seluruh baris saat ini</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + L
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Sisipkan baris baru di atas</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + Shift + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Sisipkan baris baru di bawah</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Shift + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Salin / potong baris penuh</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + C / Ctrl + X
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Hapus baris saat ini</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + Shift + K
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Tambah / kurangi indentasi</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Tab / Shift + Tab
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Indent / outdent baris</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + ] / [
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Urungkan / ulangi (Undo / Redo)</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + Z / Ctrl + Y
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Simpan perubahan kode</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Ctrl + S
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Pasangan tanda kurung & kutip otomatis</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  &#123;&#125; () [] &quot;&quot; &apos;&apos;
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-stone-300">Layar penuh halaman / normal</span>
                <kbd className="px-2 py-1 rounded bg-[#333333] border border-[#444444] text-stone-200 font-semibold">
                  Tombol Layar Penuh / Esc
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#252526]">
                <span className="text-emerald-400 font-semibold">Jalankan program langsung</span>
                <kbd className="px-2 py-1 rounded bg-[#0F3E2E] border border-emerald-600/40 text-emerald-200 font-bold">
                  Ctrl + Enter / F5
                </kbd>
              </div>
            </div>

            <div className="pt-2 text-right">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowShortcutsModal(false)}
                className="bg-[#0F3E2E] hover:bg-[#16533e] text-white text-xs rounded-xl"
              >
                Tutup Panduan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // jika mode layar penuh aktif render langsung di root body agar tidak tertutup navbar
  if (isFullscreen && mounted && typeof document !== "undefined") {
    return createPortal(editorContent, document.body);
  }

  return editorContent;
}
