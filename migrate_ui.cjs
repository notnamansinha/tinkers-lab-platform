const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if(file.endsWith('.tsx')){
         filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const allFiles = walkSync('./src');

allFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // PageHeader variants
  content = content.replace(/variant="cream"/g, 'variant="dark"');
  content = content.replace(/variant="indigo"/g, 'variant="dark"');
  content = content.replace(/variant="pink"/g, 'variant="dark"');
  content = content.replace(/variant="lime"/g, 'variant="dark"');

  // Background and Panels
  content = content.replace(/tl-panel-cream/g, 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-white');
  content = content.replace(/tl-panel-indigo/g, 'bg-[rgba(81,74,241,0.15)] border border-[rgba(81,74,241,0.3)] text-white');
  content = content.replace(/tl-panel-pink/g, 'bg-[rgba(236,104,216,0.15)] border border-[rgba(236,104,216,0.3)] text-white');
  
  content = content.replace(/text-black\/([0-9]+)/g, 'text-white/$1');
  
  content = content.replace(/bg-cream/g, 'bg-[rgba(255,255,255,0.05)]');
  content = content.replace(/bg-charcoal/g, 'bg-[rgba(0,0,0,0.4)]');
  content = content.replace(/tl-input-light/g, 'tl-input');

  content = content.replace(/tl-table/g, ''); 
  
  content = content.replace(/text-black text-sm/g, 'text-white text-[13px]');
  content = content.replace(/text-black font-medium/g, 'text-white font-medium');
  content = content.replace(/text-black font-bold/g, 'text-white font-semibold');
  content = content.replace(/text-black text-xl/g, 'text-white text-[20px]');
  content = content.replace(/text-black text-2xl/g, 'text-white text-[24px]');
  // Also any stray `text-black` that follows an open quote (like class="text-black...")
  content = content.replace(/\"text-black/g, '"text-white');
  // Also generic ` text-black `
  content = content.replace(/ text-black /g, ' text-white ');

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
  }
});
