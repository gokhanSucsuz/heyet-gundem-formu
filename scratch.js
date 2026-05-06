const { JSDOM } = require("jsdom");
const html = `
<p>Form Title Here</p>
<ol>
  <li>First item text</li>
  <li>Second item text with a table
    <table>
      <tr><td>Header 1</td><td>Header 2</td></tr>
      <tr><td>Data 1</td><td>Data 2</td></tr>
    </table>
  </li>
</ol>
<p>3. Third item manually numbered</p>
<table>
  <tr><td>Col 1</td><td>Col 2</td></tr>
</table>
`;
const dom = new JSDOM(html);
const document = dom.window.document;

const newItems = [];
let currentItem = null;

const parseTable = (tableNode) => {
  const rows = [];
  Array.from(tableNode.querySelectorAll('tr')).forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td, th')).map(c => c.textContent.trim());
    rows.push(cells);
  });
  if (rows.length === 0) return undefined;
  return {
    columns: rows[0],
    rows: rows.slice(1)
  };
};

const processElement = (node) => {
  if (node.tagName === 'OL' || node.tagName === 'UL') {
    Array.from(node.children).forEach(li => {
      if (li.tagName === 'LI') {
         const tableNode = li.querySelector('table');
         // We only want the text, not the table HTML
         let clonedLi = li.cloneNode(true);
         const innerTable = clonedLi.querySelector('table');
         if (innerTable) innerTable.remove();
         
         // Use innerHTML for rich text support
         let textHtml = clonedLi.innerHTML.trim();
         
         currentItem = { id: "uuid", type: node.tagName === 'OL' ? 'numbered' : 'bullet', text: textHtml };
         
         if (tableNode) {
            currentItem.table = parseTable(tableNode);
         }
         newItems.push(currentItem);
      }
    });
  } else if (node.tagName === 'P') {
    const text = node.textContent.trim();
    if (/^\d+[\.\)\-]\s/.test(text)) {
       let textHtml = node.innerHTML.trim();
       // remove the leading number
       textHtml = textHtml.replace(/^\d+[\.\)\-]\s*/, '');
       currentItem = { id: "uuid", type: 'numbered', text: textHtml };
       newItems.push(currentItem);
    }
  } else if (node.tagName === 'TABLE') {
    if (currentItem) {
       currentItem.table = parseTable(node);
    }
  } else {
    Array.from(node.children).forEach(processElement);
  }
};

Array.from(document.body.children).forEach(processElement);
console.log(JSON.stringify(newItems, null, 2));
