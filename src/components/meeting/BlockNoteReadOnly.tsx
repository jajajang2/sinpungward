import React from "react";

// ─── BlockNote JSON types (0.15.x) ───

interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

interface InlineText {
  type: "text";
  text: string;
  styles?: TextStyle;
}

interface InlineLink {
  type: "link";
  href: string;
  content: InlineContent[];
}

interface InlineMention {
  type: "mention";
  user: string;
}

type InlineContent = InlineText | InlineLink | InlineMention;

interface TableCell {
  type?: "tableCell";
  content?: InlineContent[];
  props?: {
    colspan?: number;
    rowspan?: number;
    backgroundColor?: string;
    textColor?: string;
  };
}

interface TableRow {
  cells: Array<InlineContent[] | TableCell>;
}

interface TableContent {
  type: "tableContent";
  columnWidths?: (number | null)[];
  headerRows?: number;
  headerCols?: number;
  rows: TableRow[];
}

interface Block {
  id?: string;
  type: string;
  props?: Record<string, any>;
  content?: InlineContent[] | TableContent;
  children?: Block[];
}

// ─── Helpers ───

function parseContent(value: string): Block[] | null {
  if (!value) return null;
  try {
    const j = JSON.parse(value);
    if (Array.isArray(j) && j.length > 0) return j as Block[];
  } catch {
    // not JSON
  }
  return null;
}

function getText(inline: InlineContent): string {
  if (inline.type === "text") return inline.text || "";
  if (inline.type === "link") return inline.content.map(getText).join("");
  if (inline.type === "mention") return `@${inline.user}`;
  return "";
}

function renderInline(content: InlineContent, idx: number): React.ReactNode {
  if (content.type === "text") {
    const s = content.styles || {};
    let node: React.ReactNode = content.text;
    if (s.bold) node = <strong key={`b-${idx}`}>{node}</strong>;
    if (s.italic) node = <em key={`i-${idx}`}>{node}</em>;
    if (s.underline) node = <u key={`u-${idx}`}>{node}</u>;
    if (s.strike) node = <s key={`s-${idx}`}>{node}</s>;
    if (s.code)
      node = (
        <code key={`c-${idx}`} className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
          {node}
        </code>
      );
    if (s.textColor) {
      node = (
        <span key={`tc-${idx}`} style={{ color: s.textColor }}>
          {node}
        </span>
      );
    }
    if (s.backgroundColor) {
      node = (
        <span key={`bg-${idx}`} style={{ backgroundColor: s.backgroundColor }}>
          {node}
        </span>
      );
    }
    return <React.Fragment key={idx}>{node}</React.Fragment>;
  }
  if (content.type === "link") {
    return (
      <a
        key={idx}
        href={content.href}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {content.content.map((c, i) => renderInline(c, i))}
      </a>
    );
  }
  if (content.type === "mention") {
    return (
      <span key={idx} className="rounded bg-primary/10 px-1.5 py-0.5 text-sm font-medium text-primary">
        @{content.user}
      </span>
    );
  }
  return null;
}

function renderBlock(block: Block, index: number): React.ReactNode {
  const contentNodes = (block.content || []).map((c, i) => renderInline(c, i));
  const childrenNodes = (block.children || []).map((child, i) => renderBlock(child, i));

  switch (block.type) {
    case "heading": {
      const level = block.props?.level || 1;
      const Tag = (`h${Math.min(Math.max(level, 1), 3)}` as keyof JSX.IntrinsicElements);
      return (
        <Tag key={index} className="mt-6 mb-3 font-semibold text-foreground">
          {contentNodes}
        </Tag>
      );
    }
    case "bulletListItem":
      return (
        <li key={index} className="ml-5 list-disc leading-relaxed">
          {contentNodes}
          {childrenNodes.length > 0 && <ul className="mt-1">{childrenNodes}</ul>}
        </li>
      );
    case "numberedListItem":
      return (
        <li key={index} className="ml-5 list-decimal leading-relaxed">
          {contentNodes}
          {childrenNodes.length > 0 && <ol className="mt-1">{childrenNodes}</ol>}
        </li>
      );
    case "checkListItem": {
      const checked = !!block.props?.checked;
      return (
        <li key={index} className="flex items-start gap-2 leading-relaxed">
          <span
            className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background"
            }`}
          >
            {checked ? "✓" : ""}
          </span>
          <span className={checked ? "text-muted-foreground line-through" : ""}>
            {contentNodes}
          </span>
          {childrenNodes.length > 0 && <ul className="mt-1 w-full">{childrenNodes}</ul>}
        </li>
      );
    }
    case "table": {
      const rows = block.children || [];
      return (
        <table key={index} className="my-4 w-full border-collapse text-sm">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b">
                {(row.children || []).map((cell, ci) => (
                  <td key={ci} className="border px-3 py-2 align-top">
                    {cell.content?.map((c, i) => renderInline(c, i))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "image": {
      const url = block.props?.url || "";
      const caption = block.props?.caption || "";
      return (
        <figure key={index} className="my-4">
          {url && (
            <img
              src={url}
              alt={caption || "image"}
              className="max-h-96 max-w-full rounded-lg border object-contain"
            />
          )}
          {caption && <figcaption className="mt-1 text-center text-xs text-muted-foreground">{caption}</figcaption>}
        </figure>
      );
    }
    case "paragraph":
    default:
      return (
        <p key={index} className="mb-3 leading-relaxed text-foreground">
          {contentNodes.length === 0 ? <br /> : contentNodes}
        </p>
      );
  }
}

// ─── Main component ───

interface Props {
  content: string;
}

/**
 * Renders meeting content.
 * New records store BlockNote JSON; legacy records store plain text/HTML.
 */
export default function BlockNoteReadOnly({ content }: Props) {
  const blocks = React.useMemo(() => parseContent(content), [content]);

  // Legacy fallback
  if (!blocks) {
    const isHtml = /\<[^>]+\>/.test(content);
    if (isHtml) {
      return (
        <div
          className="prose prose-sm max-w-none whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {content}
      </div>
    );
  }

  // Group consecutive list items into <ul> or <ol>
  const grouped: React.ReactNode[] = [];
  let currentListType: "bullet" | "number" | "check" | null = null;
  let currentListItems: React.ReactNode[] = [];

  const flushList = () => {
    if (currentListItems.length === 0) return;
    if (currentListType === "bullet") {
      grouped.push(
        <ul key={`ul-${grouped.length}`} className="mb-3 list-disc space-y-1">
          {currentListItems}
        </ul>
      );
    } else if (currentListType === "number") {
      grouped.push(
        <ol key={`ol-${grouped.length}`} className="mb-3 list-decimal space-y-1">
          {currentListItems}
        </ol>
      );
    } else if (currentListType === "check") {
      grouped.push(
        <ul key={`cl-${grouped.length}`} className="mb-3 list-none space-y-1">
          {currentListItems}
        </ul>
      );
    }
    currentListItems = [];
    currentListType = null;
  };

  blocks.forEach((block, i) => {
    const listType =
      block.type === "bulletListItem"
        ? "bullet"
        : block.type === "numberedListItem"
          ? "number"
          : block.type === "checkListItem"
            ? "check"
            : null;

    if (listType) {
      if (currentListType && currentListType !== listType) {
        flushList();
      }
      currentListType = listType;
      currentListItems.push(renderBlock(block, i));
    } else {
      flushList();
      grouped.push(renderBlock(block, i));
    }
  });
  flushList();

  return <div className="bn-readonly">{grouped}</div>;
}
