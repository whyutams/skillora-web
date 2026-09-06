"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RemoveFormatting,
  Code2,
  Eye,
  Minus,
  ImageIcon,
  Upload,
} from "lucide-react";

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function HtmlEditor({
  value,
  onChange,
  placeholder = "Tuliskan deskripsi kursus, silabus, dan materi pembelajaran di sini...",
  className = "",
  minHeight = "240px",
}: HtmlEditorProps) {
  const [isCodeView, setIsCodeView] = React.useState(false);

  // Link Modal State
  const [linkModalOpen, setLinkModalOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkText, setLinkText] = React.useState("");

  // Image Modal State
  const [imageModalOpen, setImageModalOpen] = React.useState(false);
  const [imageTab, setImageTab] = React.useState<"upload" | "url">("upload");
  const [insertImageUrl, setInsertImageUrl] = React.useState("");
  const [imageAlt, setImageAlt] = React.useState("");
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [imageUploadError, setImageUploadError] = React.useState<string | null>(null);

  const editorRef = React.useRef<HTMLDivElement>(null);
  const editorImageInputRef = React.useRef<HTMLInputElement>(null);
  const isUpdatingRef = React.useRef(false);

  // Sync value from props to contentEditable without resetting cursor if already focused
  React.useEffect(() => {
    if (editorRef.current && !isCodeView) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, isCodeView]);

  const handleInput = () => {
    if (editorRef.current && !isUpdatingRef.current) {
      const html = editorRef.current.innerHTML;
      if (html === "<p><br></p>" || html === "<br>" || html === "") {
        onChange("");
      } else {
        onChange(html);
      }
    }
  };

  const executeCommand = (command: string, val: string | undefined = undefined) => {
    if (isCodeView) return;
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleInsertHeading = (tag: "h2" | "h3" | "h4" | "p") => {
    if (isCodeView) return;
    executeCommand("formatBlock", tag);
  };

  const handleOpenLinkModal = () => {
    const selectedText = window.getSelection()?.toString() || "";
    setLinkText(selectedText);
    setLinkUrl("https://");
    setLinkModalOpen(true);
  };

  const handleInsertLink = () => {
    if (linkUrl && linkUrl !== "https://") {
      if (linkText) {
        const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-emerald-600 underline">${linkText}</a>`;
        executeCommand("insertHTML", linkHtml);
      } else {
        executeCommand("createLink", linkUrl);
      }
    }
    setLinkModalOpen(false);
    setLinkUrl("");
    setLinkText("");
  };

  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "course-assets");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah file gambar.");
      }

      setInsertImageUrl(data.url);
    } catch (err: unknown) {
      setImageUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setIsUploadingImage(false);
      if (editorImageInputRef.current) editorImageInputRef.current.value = "";
    }
  };

  const handleInsertImage = () => {
    if (!insertImageUrl) return;

    const alt = imageAlt.trim() || "Gambar materi pembelajaran";
    const imgHtml = `<p><img src="${insertImageUrl}" alt="${alt}" class="rounded-xl my-4 max-w-full h-auto border border-stone-200 dark:border-stone-800 shadow-xs" /></p><p><br></p>`;

    if (isCodeView) {
      onChange((value || "") + `\n${imgHtml}`);
    } else {
      executeCommand("insertHTML", imgHtml);
    }

    setImageModalOpen(false);
    setInsertImageUrl("");
    setImageAlt("");
    setImageUploadError(null);
  };

  return (
    <div
      className={`rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 overflow-hidden shadow-2xs transition-colors focus-within:ring-2 focus-within:ring-[#0F3E2E] dark:focus-within:ring-emerald-500 focus-within:border-transparent ${className}`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 select-none text-stone-700 dark:text-stone-300">
        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-stone-800 pr-1 mr-1">
          <button
            type="button"
            onClick={() => handleInsertHeading("p")}
            disabled={isCodeView}
            className="px-2 py-1 text-xs font-semibold rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Paragraf Biasa"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => handleInsertHeading("h2")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Heading 2 (Judul Besar)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertHeading("h3")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Heading 3 (Sub-judul)"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertHeading("h4")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Heading 4 (Kecil)"
          >
            <Heading4 className="w-4 h-4" />
          </button>
        </div>

        {/* Text Styles */}
        <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-stone-800 pr-1 mr-1">
          <button
            type="button"
            onClick={() => executeCommand("bold")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Tebal (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("italic")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Miring (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("underline")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Garis Bawah (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("strikeThrough")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Coret"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-stone-800 pr-1 mr-1">
          <button
            type="button"
            onClick={() => executeCommand("insertUnorderedList")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Daftar Simbol (Bullet List)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("insertOrderedList")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Daftar Angka (Numbered List)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertHeading("p")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Kutipan / Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("insertHorizontalRule")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Garis Pembatas (Divider)"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Links, Images & Alignment */}
        <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-stone-800 pr-1 mr-1">
          <button
            type="button"
            onClick={() => executeCommand("justifyLeft")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Rata Kiri"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyCenter")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Rata Tengah"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("justifyRight")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Rata Kanan"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenLinkModal}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Sisipkan Tautan (Link)"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand("unlink")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors"
            title="Hapus Tautan"
          >
            <Unlink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setImageModalOpen(true);
              setInsertImageUrl("");
              setImageAlt("");
              setImageUploadError(null);
            }}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors text-purple-600 dark:text-purple-400"
            title="Sisipkan Gambar (Upload / URL)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Clear formatting */}
        <div className="flex items-center gap-0.5 border-r border-stone-200 dark:border-stone-800 pr-1 mr-1">
          <button
            type="button"
            onClick={() => executeCommand("removeFormat")}
            disabled={isCodeView}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-40 transition-colors text-rose-600 dark:text-rose-400"
            title="Hapus Format Teks"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle: Visual WYSIWYG vs HTML Source */}
        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={() => setIsCodeView((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              isCodeView
                ? "bg-[#0F3E2E] text-white"
                : "bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700"
            }`}
            title={isCodeView ? "Beralih ke Tampilan Visual" : "Beralih ke Kode HTML"}
          >
            {isCodeView ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Visual</span>
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5" />
                <span>HTML Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {isCodeView ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="<p>Masukkan kode HTML di sini...</p>"
          style={{ minHeight }}
          className="w-full p-4 font-mono text-xs bg-stone-900 text-emerald-400 focus:outline-none resize-y border-none leading-relaxed"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className="p-4 text-sm text-stone-900 dark:text-stone-100 focus:outline-none overflow-y-auto leading-relaxed prose dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400 empty:before:pointer-events-none [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-1.5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:my-1 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-stone-500 [&_code]:bg-stone-100 [&_code]:dark:bg-stone-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_a]:text-emerald-600 [&_a]:underline [&_img]:rounded-xl [&_img]:max-w-full [&_img]:my-3"
        />
      )}

      {/* Link Insertion Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-emerald-600" />
              <span>Sisipkan Tautan Link</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  Teks Tautan
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Contoh: Buka Dokumentasi"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  URL Tujuan *
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0F3E2E] text-white hover:bg-[#15533d]"
              >
                Sisipkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Insertion Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600" />
              <span>Sisipkan Gambar ke Materi</span>
            </h3>

            {/* Tab: Upload vs URL */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImageTab("upload")}
                className={`flex-1 py-1.5 rounded-lg transition-colors text-center ${
                  imageTab === "upload"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                Upload dari Komputer
              </button>
              <button
                type="button"
                onClick={() => setImageTab("url")}
                className={`flex-1 py-1.5 rounded-lg transition-colors text-center ${
                  imageTab === "url"
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              >
                Gunakan URL Gambar
              </button>
            </div>

            {imageUploadError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {imageUploadError}
              </p>
            )}

            {imageTab === "upload" ? (
              <div className="space-y-3">
                <input
                  ref={editorImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditorImageUpload}
                  className="hidden"
                />
                {insertImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 h-36 bg-stone-100 dark:bg-stone-800">
                    <img
                      src={insertImageUrl}
                      alt="Pratinjau"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setInsertImageUrl("")}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 text-white hover:bg-rose-600 text-xs transition-colors"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => editorImageInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-purple-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-stone-50/50 dark:bg-stone-950/40"
                  >
                    <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      {isUploadingImage ? "Mengunggah..." : "Pilih File Gambar"}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      JPG, PNG, WEBP (Maks. 5 MB)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    URL Gambar *
                  </label>
                  <input
                    type="url"
                    value={insertImageUrl}
                    onChange={(e) => setInsertImageUrl(e.target.value)}
                    placeholder="https://example.com/gambar.png"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Keterangan Gambar (Alt Text)
              </label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Contoh: Diagram arsitektur sistem"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!insertImageUrl || isUploadingImage}
                onClick={handleInsertImage}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-40"
              >
                Sisipkan ke Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
