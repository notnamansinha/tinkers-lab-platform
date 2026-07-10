import fs from 'fs';
import path from 'path';
import https from 'https';

const TOKEN = process.env.FIGMA_TOKEN || '';
const FILE_KEY = 'HStb8snmR7asH2KhP8bJUF';
const NODE_IDS_DASH = [
  '47-77', '47-125', '47-78', '47-82', '47-86', '47-117',
  '47-90', '47-94', '47-98', '47-121', '47-102', '47-109',
  '47-113', '47-129', '47-133'
];
const NODE_IDS = NODE_IDS_DASH.map(id => id.replace('-', ':'));

const ASSETS_DIR = path.join(process.cwd(), 'src', 'assets', 'tinkerer-figjam');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'X-Figma-Token': TOKEN }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  try {
    console.log('Fetching node names...');
    const nodesUrl = `https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${NODE_IDS.join(',')}`;
    const nodesData = await fetchJson(nodesUrl);
    
    const nodeNames = {};
    for (const [id, nodeData] of Object.entries(nodesData.nodes)) {
      nodeNames[id] = nodeData.document.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() || id.replace(':', '-');
    }

    console.log('Fetching SVG export URLs...');
    const imagesUrl = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${NODE_IDS.join(',')}&format=svg`;
    const imagesData = await fetchJson(imagesUrl);
    
    if (imagesData.err) {
      throw new Error(`Figma API Error: ${imagesData.err}`);
    }

    const { images } = imagesData;
    
    for (const [id, url] of Object.entries(images)) {
      if (!url) {
        console.warn(`No URL returned for node ${id}`);
        continue;
      }
      const name = nodeNames[id] || id.replace(':', '-');
      const filename = `${name}.svg`;
      const destPath = path.join(ASSETS_DIR, filename);
      
      console.log(`Downloading ${filename} from ${url}...`);
      await downloadFile(url, destPath);
      console.log(`Saved ${filename}`);
    }
    
    console.log('Done!');
  } catch (err) {
    console.error('Failed:', err);
  }
}

run();
