// Re-implement parseMarkdown for testing (same logic as in ReleaseDetail.tsx)
function parseMarkdown(text: string) {
  if (!text) return '';
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hl])/gm, '')
    .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>');
}

describe('parseMarkdown', () => {
  it('should return empty string for empty input', () => {
    expect(parseMarkdown('')).toBe('');
    expect(parseMarkdown(null as any)).toBe('');
    expect(parseMarkdown(undefined as any)).toBe('');
  });

  it('should convert ## headers to h2', () => {
    expect(parseMarkdown('## Header')).toBe('<h2>Header</h2>');
  });

  it('should convert ### headers to h3', () => {
    expect(parseMarkdown('### SubHeader')).toBe('<h3>SubHeader</h3>');
  });

  it('should convert * list items to li', () => {
    // Note: single list items get wrapped in <ul> tags by the function
    expect(parseMarkdown('* Item 1')).toBe('<ul><li>Item 1</li></ul>');
  });

  it('should convert - list items to li', () => {
    // Note: single list items get wrapped in <ul> tags by the function
    expect(parseMarkdown('- Item 2')).toBe('<ul><li>Item 2</li></ul>');
  });

  it('should convert **bold** to strong', () => {
    expect(parseMarkdown('**bold text**')).toBe('<strong>bold text</strong>');
  });

  it('should convert `code` to code tags', () => {
    expect(parseMarkdown('`inline code`')).toBe('<code>inline code</code>');
  });

  it('should group consecutive list items into ul', () => {
    const result = parseMarkdown('* Item 1\n* Item 2\n* Item 3');
    expect(result).toContain('<ul>');
    expect(result).toContain('</ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<li>Item 2</li>');
  });

  it('should handle multiple paragraphs', () => {
    const result = parseMarkdown('Paragraph 1\n\nParagraph 2');
    expect(result).toContain('</p><p>');
  });
});
