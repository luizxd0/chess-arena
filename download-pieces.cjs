const fs = require('fs');
const path = require('path');
const https = require('https');

const pieces = [
  { name: 'pl', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pl45.svg' },
  { name: 'pd', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pd45.svg' },
  { name: 'nl', url: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nl45.svg' },
  { name: 'nd', url: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_nd45.svg' }, // corrected nd url
  { name: 'bl', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_bl45.svg' },
  { name: 'bd', url: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bd45.svg' }, // corrected bd url
  { name: 'rl', url: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rl45.svg' },
  { name: 'rd', url: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rd45.svg' }, // corrected rd url
  { name: 'ql', url: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_ql45.svg' },
  { name: 'qd', url: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qd45.svg' }, // corrected qd url
  { name: 'kl', url: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_kl45.svg' },
  { name: 'kd', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kd45.svg' }, // corrected kd url
];

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

const main = async () => {
  const dir = path.join(__dirname, 'public', 'pieces');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const piece of pieces) {
    const dest = path.join(dir, `${piece.name}.svg`);
    console.log(`Downloading ${piece.name} from ${piece.url}...`);
    try {
      await download(piece.url, dest);
      console.log(`Successfully downloaded ${piece.name}`);
    } catch (err) {
      console.error(`Error downloading ${piece.name}: ${err.message}`);
    }
  }
};

main();
