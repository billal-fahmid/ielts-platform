import { Fragment } from "react";

type Block = { type: "p"; text: string } | { type: "ul" | "ol"; items: string[] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

/** Splits the tutor's light formatting (paragraphs, "-" bullets, "1." lists) into blocks. */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (const line of text.split("\n")) {
    const bullet = line.match(BULLET);
    const numbered = line.match(NUMBERED);
    if (bullet || numbered) {
      flushParagraph();
      const type = bullet ? "ul" : "ol";
      const item = (bullet ?? numbered)![1];
      const last = blocks[blocks.length - 1];
      if (last && last.type === type) last.items.push(item);
      else blocks.push({ type, items: [item] });
    } else if (line.trim() === "") {
      flushParagraph();
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  return blocks;
}

/** **bold** and *italic* only; everything else is rendered as plain text (never as HTML). */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export function MessageContent({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {parseBlocks(text).map((block, i) => {
        if (block.type === "p") {
          return (
            <p key={i} className="whitespace-pre-line">
              <Inline text={block.text} />
            </p>
          );
        }
        const Tag = block.type;
        return (
          <Tag key={i} className={block.type === "ul" ? "list-disc pl-5" : "list-decimal pl-5"}>
            {block.items.map((item, j) => (
              <li key={j} className="pl-0.5">
                <Inline text={item} />
              </li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}
