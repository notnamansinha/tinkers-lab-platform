const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src', 'features', 'admin');
if (!fs.existsSync(adminDir)) {
  console.log('Admin directory not found');
  process.exit(0);
}

const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add Shadcn imports if not present
  if (content.includes('<table') && !content.includes('TableBody')) {
    const importRegex = /import\s+\{.*\}\s+from\s+['"]@\/components\/ui\/.*['"]/s;
    if (importRegex.test(content)) {
      content = content.replace(/(import\s+\{.*?\}\s+from\s+['"]@\/components\/ui\/.*?['"])/, `$1\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'`);
    } else {
      content = content.replace(/(import.*?from.*?['"].*?['"]\n)/, `$1import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'\n`);
    }
  }

  // Replace Table Tags
  content = content.replace(/<table[^>]*>/g, '<Table>');
  content = content.replace(/<\/table>/g, '</Table>');
  
  content = content.replace(/<thead[^>]*>/g, '<TableHeader>');
  content = content.replace(/<\/thead>/g, '</TableHeader>');
  
  content = content.replace(/<tbody[^>]*>/g, '<TableBody>');
  content = content.replace(/<\/tbody>/g, '</TableBody>');
  
  content = content.replace(/<tr[^>]*>/g, '<TableRow>');
  content = content.replace(/<\/tr>/g, '</TableRow>');

  // th -> TableHead
  content = content.replace(/<th[^>]*>/g, '<TableHead>');
  content = content.replace(/<\/th>/g, '</TableHead>');

  // td -> TableCell
  content = content.replace(/<td[^>]*>/g, '<TableCell>');
  content = content.replace(/<\/td>/g, '</TableCell>');

  // Replace Search inputs
  content = content.replace(/<input value=\{search\} onChange=\{e => setSearch\(e\.target\.value\)\} placeholder="([^"]+)" className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring" \/>/g, 
  `<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="$1" className="pl-9" />`);
  
  if (content.includes('<Input') && !content.includes('import { Input }')) {
     content = content.replace(/(import { Table.*)/, `import { Input } from '@/components/ui/input'\n$1`);
  }

  // Replace some raw buttons
  content = content.replace(/<button onClick=\{([^\}]+)\} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"[^>]*>([\s\S]*?)<\/button>/g,
  `<Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={$1}>$2</Button>`);

  content = content.replace(/<button onClick=\{([^\}]+)\} className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200"[^>]*>([\s\S]*?)<\/button>/g,
  `<Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100" onClick={$1}>$2</Button>`);

  if (content.includes('<Button') && !content.includes('import { Button }')) {
    content = content.replace(/(import { Input.*|import { Table.*)/, `import { Button } from '@/components/ui/button'\n$1`);
  }

  fs.writeFileSync(filePath, content);
  console.log('Refactored', file);
}
