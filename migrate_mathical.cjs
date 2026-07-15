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

  content = content.replace(/kivo-glass-panel/g, 'bg-[#1A1A1A] rounded-[24px]');
  content = content.replace(/tl-glass/g, 'bg-[#1A1A1A] rounded-[24px]');
  content = content.replace(/bg-\[rgba\(255,255,255,0\.03\)\]/g, 'bg-[#1A1A1A]');
  content = content.replace(/bg-\[rgba\(255,255,255,0\.05\)\]/g, 'bg-[#1A1A1A]');
  content = content.replace(/backdrop-blur-[a-z]+/g, '');
  content = content.replace(/-webkit-backdrop-blur-[a-z]+/g, '');

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
  }
});
