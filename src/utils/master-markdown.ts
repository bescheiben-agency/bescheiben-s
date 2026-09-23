export type ContentBlock =
  | { type: 'eyebrow' | 'heading' | 'subheading' | 'paragraph' | 'statement'; text: string }
  | { type: 'ul' | 'ol'; items: string[] };

const cleanInline = (value: string) => value.trim().replace(/^\*\*(.+)\*\*$/, '$1');

export function parseMasterMarkdown(markdown: string): ContentBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ContentBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (/^### (CTA|Destaque|Botão|Microcopy)/i.test(line)) continue;

    if (line.startsWith('### ')) {
      blocks.push({ type: 'eyebrow', text: cleanInline(line.slice(4)) });
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading', text: cleanInline(line.slice(2)) });
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'subheading', text: cleanInline(line.slice(3)) });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      const items = [cleanInline(unordered[1])];
      while (index + 1 < lines.length) {
        const match = /^\s*[-*]\s+(.+)$/.exec(lines[index + 1]);
        if (!match) break;
        items.push(cleanInline(match[1]));
        index += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      const items = [cleanInline(ordered[1])];
      while (index + 1 < lines.length) {
        const match = /^\s*\d+[.)]\s+(.+)$/.exec(lines[index + 1]);
        if (!match) break;
        items.push(cleanInline(match[1]));
        index += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    blocks.push({
      type: /^\*\*.+\*\*$/.test(line) ? 'statement' : 'paragraph',
      text: cleanInline(line),
    });
  }

  return blocks;
}

export function plainText(markdown: string): string {
  return markdown
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\n{2,}/g, ' ')
    .trim();
}

export function extractFinalCta(
  markdown: string,
  actionLabels: readonly string[] = [],
): { eyebrow?: string; title: string; body: string[] } {
  const blocks = parseMasterMarkdown(markdown).filter(
    (block) => !('text' in block && actionLabels.includes(block.text)),
  );
  const headings = blocks.filter((block) => block.type === 'heading');
  const eyebrow = blocks.find((block) => block.type === 'eyebrow');
  const body = blocks.filter((block) => block.type !== 'heading' && block.type !== 'eyebrow');
  return {
    ...(eyebrow && 'text' in eyebrow ? { eyebrow: eyebrow.text } : {}),
    title: headings.map((block) => 'text' in block ? block.text : '').join(' '),
    body: body.flatMap((block) => 'text' in block ? [block.text] : block.items),
  };
}
