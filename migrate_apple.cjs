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

  // Revert neo-pop black/white
  content = content.replace(/bg-\[#1A1A1A\] rounded-\[24px\]/g, 'premium-glass-card');
  content = content.replace(/bg-\[#1A1A1A\]/g, 'bg-white/40 border border-white/20 shadow-sm');
  
  // Revert texts
  content = content.replace(/text-white\/50/g, 'text-[#7D9FC2]');
  content = content.replace(/text-white\/40/g, 'text-[#7D9FC2]');
  content = content.replace(/text-white\/60/g, 'text-[#7D9FC2]');
  // content = content.replace(/text-white/g, 'text-[#56779D]'); // Might be too aggressive, but necessary for light theme
  // Let's do it carefully
  content = content.replace(/'text-white'/g, "'text-[#56779D]'");
  content = content.replace(/"text-white"/g, '"text-[#56779D]"');
  content = content.replace(/ text-white /g, ' text-[#56779D] ');
  content = content.replace(/ text-white"/g, ' text-[#56779D]"');

  // Revert borders and rgba backgrounds
  content = content.replace(/border-\[rgba\(255,255,255,0\.06\)\]/g, 'border-white/20');
  content = content.replace(/border-\[rgba\(255,255,255,0\.05\)\]/g, 'border-white/20');
  content = content.replace(/border-\[rgba\(255,255,255,0\.1\)\]/g, 'border-[#6FA9FF]/50');
  content = content.replace(/bg-\[rgba\(255,255,255,0\.06\)\]/g, 'bg-white/60');
  content = content.replace(/bg-\[rgba\(255,255,255,0\.08\)\]/g, 'bg-white/70');
  
  // Neo-pop colors
  content = content.replace(/bg-\[#FF60DB\]/g, 'bg-[#72E8FF] text-[#56779D]');
  content = content.replace(/text-\[#FF60DB\]/g, 'text-[#72E8FF]');

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
  }
});
