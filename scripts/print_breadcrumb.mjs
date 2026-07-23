// 提取并打印指定页面里的 BreadcrumbList JSON-LD，确认结构正确
import { readFileSync } from 'fs';

const files = [
  'D:/D独立站资料/产品图片/hlk-nasal-strips/dist/products/index.html',
  'D:/D独立站资料/产品图片/hlk-nasal-strips/dist/blog/how-to-choose-nasal-strips/index.html',
  'D:/D独立站资料/产品图片/hlk-nasal-strips/dist/oem/index.html',
];

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const m = html.match(/"@type"\s*:\s*"BreadcrumbList"[\s\S]*?\}\s*\]\s*\}/);
  console.log('\n=== ' + f.split('/').slice(-3).join('/'));
  if (m) {
    try {
      const obj = JSON.parse(m[0].replace(/,\s*$/, ''));
      obj.itemListElement.forEach(it => console.log(`  ${it.position}. ${it.name}  ->  ${it.item}`));
    } catch (e) {
      console.log('  (raw) ' + m[0].slice(0, 300));
    }
  } else {
    console.log('  NO BreadcrumbList found');
  }
}
