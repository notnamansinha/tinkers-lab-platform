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

  content = content.replace(/bg-\[\#050505\]/g, 'bg-transparent');
  content = content.replace(/bg-black\/20/g, 'bg-white/5');
  content = content.replace(/border-black\/10/g, 'border-white/10');
  content = content.replace(/border-black\/20/g, 'border-white/10');
  
  // Make sure KpiTile matches KIVO
  // KpiTile was previously using #DDF237 and similar bright backgrounds with black text for the values.
  // In KIVO, KPIs are usually dark glass with white/neon text. 
  // Let's just fix hardcoded text-black where it shouldn't be.
  content = content.replace(/text-black\/[0-9]+/g, 'text-white/50');
  content = content.replace(/text-black/g, 'text-white');

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
  }
});
