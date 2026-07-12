const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ImageRun,
  ShadingType, LevelFormat
} = require('docx');

const IMG_DIR = __dirname;

// Parse markdown to tokens
const md = fs.readFileSync(path.join(__dirname, '产品介绍章节.md'), 'utf-8');
const tokens = marked.lexer(md);

// State trackers
let inTable = false;
let tableRows = [];
let tableHeader = null;
let inCodeBlock = false;

// Convert inline tokens to TextRun[]
function parseInline(tokens) {
  const runs = [];
  if (!tokens) return runs;
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        runs.push(new TextRun({ text: t.text }));
        break;
      case 'strong':
        runs.push(...parseInline(t.tokens).map(r => new TextRun({ ...r.options, bold: true })));
        break;
      case 'em':
        runs.push(...parseInline(t.tokens).map(r => new TextRun({ ...r.options, italics: true })));
        break;
      case 'codespan':
        runs.push(new TextRun({ text: t.text, font: 'Courier New', size: 20 }));
        break;
      case 'link':
        runs.push(new TextRun({ text: t.text || t.href, color: '2b579a', underline: {} }));
        break;
      case 'br':
        runs.push(new TextRun({ break: 1 }));
        break;
      case 'image':
        // Placeholder for images not found
        runs.push(new TextRun({ text: `[图片: ${t.title || t.text}]`, italics: true, color: '888888' }));
        break;
      default:
        if (t.text) runs.push(new TextRun({ text: t.text }));
        else if (t.tokens) runs.push(...parseInline(t.tokens));
    }
  }
  return runs;
}

function createParagraphFromText(text, options = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    ...options,
    children: [new TextRun({ text, ...options.runOptions })],
  });
}

// Process tokens into docx children
const children = [];

for (let i = 0; i < tokens.length; i++) {
  const t = tokens[i];

  // End code block
  if (t.type !== 'code' && inCodeBlock) {
    inCodeBlock = false;
  }

  switch (t.type) {
    case 'heading': {
      const level = t.depth;
      const headingMap = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      };
      children.push(new Paragraph({
        heading: headingMap[level] || HeadingLevel.HEADING_3,
        spacing: { before: level <= 2 ? 360 : 240, after: 200 },
        children: parseInline(t.tokens),
      }));
      break;
    }

    case 'paragraph': {
      // Check if paragraph contains only an image
      const firstToken = t.tokens && t.tokens[0];
      if (firstToken && firstToken.type === 'image') {
        const imgPath = path.join(IMG_DIR, firstToken.href);
        try {
          if (fs.existsSync(imgPath)) {
            const ext = path.extname(firstToken.href).slice(1);
            const buf = fs.readFileSync(imgPath);
            children.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120 },
              children: [new ImageRun({
                data: buf,
                transformation: {
                  width: buf.length > 200000 ? 500 : (buf.length > 80000 ? 600 : 750),
                  height: buf.length > 200000 ? 350 : (buf.length > 80000 ? 400 : 500),
                },
                type: ext === 'jpg' ? 'jpg' : 'png',
              })],
            }));
            continue;
          }
        } catch(e) {}
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [new TextRun({ text: `[图片: ${firstToken.text || firstToken.href}]`, italics: true, color: '888888' })],
        }));
        continue;
      }

      // Regular paragraph
      if (t.tokens && t.tokens.length > 0) {
        children.push(new Paragraph({
          spacing: { after: 120, line: 360 },
          children: parseInline(t.tokens),
        }));
      }
      break;
    }

    case 'table': {
      // Build table
      const headerRow = t.header;
      const rows = t.rows;
      const allRows = [headerRow, ...rows];

      const docxRows = allRows.map((row, ri) => {
        return new TableRow({
          tableHeader: ri === 0,
          children: row.map(cell => {
            const cellChildren = [];
            if (cell.tokens && cell.tokens.length > 0) {
              cellChildren.push(new Paragraph({
                spacing: { after: 60, before: 60 },
                children: parseInline(cell.tokens),
              }));
            } else if (cell.text) {
              cellChildren.push(new Paragraph({
                spacing: { after: 60, before: 60 },
                children: [new TextRun({ text: cell.text })],
              }));
            }
            return new TableCell({
              children: cellChildren,
              shading: ri === 0 ? { type: ShadingType.SOLID, color: '1a1410', fill: '1a1410' } : undefined,
              width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
            });
          }),
        });
      });

      children.push(new Table({
        rows: docxRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
      break;
    }

    case 'code': {
      const lines = t.text.split('\n');
      for (const line of lines) {
        children.push(new Paragraph({
          spacing: { after: 40, line: 300 },
          indent: { left: 360 },
          children: [new TextRun({ text: line, font: 'Courier New', size: 18, color: '333333' })],
        }));
      }
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      break;
    }

    case 'blockquote': {
      if (t.tokens) {
        for (const qt of t.tokens) {
          if (qt.text) {
            children.push(new Paragraph({
              spacing: { after: 80, line: 340 },
              indent: { left: 480 },
              border: { left: { style: BorderStyle.SINGLE, size: 6, color: 'C9A96E', space: 12 } },
              children: [new TextRun({ text: qt.text, italics: true, color: '555555' })],
            }));
          }
        }
      }
      break;
    }

    case 'hr': {
      children.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'C9A96E', space: 6 } },
        spacing: { before: 120, after: 120 },
        children: [],
      }));
      break;
    }

    case 'list': {
      for (const item of t.items) {
        const bullet = t.ordered ? `${(item.number || 1)}.` : '•';
        if (item.tokens && item.tokens.length > 0) {
          const firstT = item.tokens[0];
          children.push(new Paragraph({
            spacing: { after: 80, line: 340 },
            indent: { left: 360, hanging: 240 },
            children: [
              new TextRun({ text: `${bullet} `, bold: true }),
              ...(firstT.tokens ? parseInline(firstT.tokens) : [new TextRun({ text: firstT.text || '' })]),
            ],
          }));
          // Handle nested tokens
          for (let j = 1; j < item.tokens.length; j++) {
            const nt = item.tokens[j];
            if (nt.tokens) {
              children.push(new Paragraph({
                spacing: { after: 80, line: 340 },
                indent: { left: 600 },
                children: parseInline(nt.tokens),
              }));
            }
          }
        }
      }
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      break;
    }

    case 'space':
      break;

    default:
      break;
  }
}

// Create document
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Microsoft YaHei', size: 22, color: '1a1410' },
      },
    },
    paragraphStyles: [{
      id: 'Heading1',
      name: 'Heading 1',
      run: { size: 36, bold: true, color: '1a1410', font: 'Microsoft YaHei' },
      paragraph: { spacing: { before: 480, after: 240 } },
    }, {
      id: 'Heading2',
      name: 'Heading 2',
      run: { size: 28, bold: true, color: 'C9A96E', font: 'Microsoft YaHei' },
      paragraph: { spacing: { before: 360, after: 200 } },
    }, {
      id: 'Heading3',
      name: 'Heading 3',
      run: { size: 24, bold: true, color: '1a1410', font: 'Microsoft YaHei' },
      paragraph: { spacing: { before: 280, after: 160 } },
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
      },
    },
    children,
  }],
});

// Generate
Packer.toBuffer(doc).then(buffer => {
  const outPath = path.join(__dirname, '产品介绍章节.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('Done: ' + outPath + ' (' + (buffer.length / 1024).toFixed(0) + ' KB)');
});
