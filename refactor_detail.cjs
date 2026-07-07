const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src', 'features');
if (!fs.existsSync(baseDir)) {
  console.log('Features directory not found');
  process.exit(0);
}

const files = [
  'inventory/CheckoutPage.tsx',
  'workshops/WorkshopDetailPage.tsx',
  'projects/ProjectDetailPage.tsx',
  'maintenance/MaintenanceDetailPage.tsx',
  'notifications/NotificationsPage.tsx'
].map(f => path.join(baseDir, f));

for (const filePath of files) {
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add Shadcn imports if not present
  if (content.includes('<button') && !content.includes('import { Button }')) {
    content = content.replace(/(import .* from .*?\n)/, `import { Button } from '@/components/ui/button'\n$1`);
  }

  // Replace back button
  content = content.replace(/<button onClick=\{\(\) => navigate\(-1\)\} className="p-2 rounded-md hover:bg-muted">\s*<ArrowLeft size=\{18\} \/>\s*<\/button>/g,
  `<Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>`);

  // Replace standard buttons
  content = content.replace(/<button type="submit" disabled=\{isSubmitting\} className="flex items-center gap-2 px-5 py-2\.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary\/90 disabled:opacity-60">/g,
  `<Button type="submit" disabled={isSubmitting} className="gap-2">`);
  
  content = content.replace(/<button type="button" onClick=\{\(\) => navigate\(-1\)\} className="px-4 py-2\.5 border rounded-md text-sm hover:bg-muted">Cancel<\/button>/g,
  `<Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>`);

  content = content.replace(/<button onClick=\{markAllRead\} className="flex items-center gap-1\.5 text-xs text-primary hover:underline">/g,
  `<Button variant="link" size="sm" onClick={markAllRead} className="gap-1.5 text-xs h-auto p-0">`);
  
  content = content.replace(/<\/button>/g, '</Button>');

  // Input fixes
  if (content.includes('<input') && !content.includes('import { Input }')) {
     content = content.replace(/(import .* from .*?\n)/, `import { Input } from '@/components/ui/input'\n$1`);
  }

  content = content.replace(/<input type="number" min=\{1\} className=\{inp\(\!\!errors\.quantity\)\} \{\.\.\.register\('quantity'\)\} \/>/g,
  `<Input type="number" min={1} className={inp(!!errors.quantity)} {...register('quantity')} />`);

  content = content.replace(/<input type="date" className=\{inp\(false\)\} \{\.\.\.register\('dueDate'\)\} \/>/g,
  `<Input type="date" className={inp(false)} {...register('dueDate')} />`);

  fs.writeFileSync(filePath, content);
  console.log('Refactored', filePath);
}
