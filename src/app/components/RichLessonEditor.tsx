import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Type,
} from "lucide-react";
import { Button } from "./ui/button";
import { sanitizeHtml } from "../utils/editorUtils";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  day?: number | string;
  title?: string;
  type?: string;
};

type HeadingLevel = "p" | "h1" | "h2" | "h3";

export function RichLessonEditor({
  value,
  onChange,
  placeholder,
  day,
  title,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const nextDayRef = useRef<number>(Number(day || 1));
  const [nextDay, setNextDay] = useState<number>(Number(day || 1));
  const [currentBlock, setCurrentBlock] = useState<HeadingLevel>("p");

  useEffect(() => {
    const d = Number(day || 1);
    nextDayRef.current = d;
    setNextDay(d);
  }, [day]);

  useEffect(() => {
    if (!ref.current) return;
    if (!focused) {
      ref.current.innerHTML = value || "";
    }
  }, [value, focused]);

  const syncChange = useCallback(() => {
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML));
  }, [onChange]);

  const exec = useCallback(
    (cmd: string, arg?: string) => {
      document.execCommand(cmd, false, arg);
      syncChange();
    },
    [syncChange],
  );

  const getActiveTag = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return "p";
    let node: Node | null = sel.anchorNode;
    const editor = ref.current;
    if (!editor) return "p";
    while (node && node !== editor) {
      if (
        node instanceof HTMLElement &&
        ["H1", "H2", "H3", "P"].includes(node.tagName)
      ) {
        return node.tagName.toLowerCase() as HeadingLevel;
      }
      node = node.parentNode;
    }
    return "p";
  }, []);

  const handleSelectionChange = useCallback(() => {
    if (!focused) return;
    const tag = getActiveTag();
    setCurrentBlock(tag);
  }, [focused, getActiveTag]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  const applyHeading = useCallback(
    (level: HeadingLevel) => {
      if (level === "h1") {
        document.execCommand("formatBlock", false, "<H1>");
        if (!ref.current) return;

        const sel = window.getSelection();
        let node: Node | null = sel && sel.anchorNode ? sel.anchorNode : null;
        while (
          node &&
          node !== ref.current &&
          node.nodeType === Node.TEXT_NODE
        ) {
          node = node.parentNode;
        }
        let h1: HTMLElement | null = null;
        while (node && node !== ref.current) {
          if (node instanceof HTMLElement && node.tagName === "H1") {
            h1 = node;
            break;
          }
          node = node && node.parentNode ? node.parentNode : null;
        }
        if (!h1) {
          const h1s = ref.current.querySelectorAll("h1");
          if (h1s.length) h1 = h1s[h1s.length - 1] as HTMLElement;
        }
        if (h1) {
          const text = h1.innerText || "";
          if (!/Day\s*\d+/i.test(text)) {
            const dayToUse = nextDayRef.current || 1;
            h1.innerText = `Day ${dayToUse} — ${text}`;
            nextDayRef.current = dayToUse + 1;
            setNextDay(dayToUse + 1);
          }
        }
      } else {
        document.execCommand("formatBlock", false, `<${level.toUpperCase()}>`);
      }
      syncChange();
      setCurrentBlock(level);
    },
    [syncChange],
  );

  const handleInput = useCallback(() => {
    syncChange();
  }, [syncChange]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      const html = text
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
        .join("");
      document.execCommand("insertHTML", false, html);
      handleInput();
    },
    [handleInput],
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-2 bg-gray-50/80 border-b border-gray-100">
        <button onClick={() => applyHeading("h1")} className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${currentBlock === "h1" ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`} title="Heading 1 — auto Day">
          <Heading1 className="h-3.5 w-3.5" /> Heading 1
        </button>
        <button onClick={() => applyHeading("h2")} className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${currentBlock === "h2" ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`} title="Heading 2">
          <Heading2 className="h-3.5 w-3.5" /> Heading 2
        </button>
        <button onClick={() => applyHeading("p")} className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${currentBlock === "p" ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`} title="Paragraph">
          <Type className="h-3.5 w-3.5" /> Paragraph
        </button>

        <span className="w-px h-4 bg-gray-200 mx-2" />

        <button onClick={() => exec("bold")} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Bold"><Bold className="h-3.5 w-3.5" /></button>
        <button onClick={() => exec("italic")} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Italic"><Italic className="h-3.5 w-3.5" /></button>

        <span className="w-px h-4 bg-gray-200 mx-2" />

        <button onClick={() => exec("insertUnorderedList")} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Bullets"><List className="h-3.5 w-3.5" /></button>
        <button onClick={() => exec("insertOrderedList")} className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Numbers"><ListOrdered className="h-3.5 w-3.5" /></button>

        <span className="flex-1" />

        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md px-2.5 py-1 shadow-sm">
          Day {nextDay}
        </span>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={ref}
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (!ref.current?.innerText?.trim()) onChange("");
          }}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[320px] w-full p-6 text-base leading-8 focus:outline-none focus:ring-0 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:text-indigo-700 [&_h1]:border-l-4 [&_h1]:border-indigo-500 [&_h1]:pl-4 [&_h1]:py-2 [&_h1]:bg-indigo-50/40 [&_h1]:my-3 [&_h1]:rounded-r-lg [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:border-b-2 [&_h2]:border-gray-100 [&_h2]:pb-1.5 [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mb-1 [&_h3]:mt-3 [&_p]:text-gray-700 [&_p]:mb-2 [&_p]:leading-7 [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:text-gray-700 [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:text-gray-700 [&_li]:mb-1 [&_hr]:border-t-2 [&_hr]:border-dashed [&_hr]:border-gray-200 [&_hr]:my-6"
          dangerouslySetInnerHTML={{ __html: value || "" }}
        />
        {(!value || !ref.current?.innerText?.trim()) && !focused && (
          <div className="absolute top-0 left-0 right-0 pointer-events-none p-6 text-base text-gray-400 select-none">
            <p className="mb-1">Start typing your content...</p>
            <p className="text-sm text-gray-300 mt-2">Select text → click <span className="font-medium text-indigo-400">Heading 1</span> to create a day section. Each H1 becomes one lesson.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default RichLessonEditor;
