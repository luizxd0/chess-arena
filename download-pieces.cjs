const fs = require('fs');
const path = require('path');
const https = require('https');

const pieces = [
  { name: 'wp', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wP.svg' },
  { name: 'wn', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wN.svg' },
  { name: 'wb', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wB.svg' },
  { name: 'wr', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wR.svg' },
  { name: 'wq', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wQ.svg' },
  { name: 'wk', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wK.svg' },
  { name: 'bp', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bP.svg' },
  { name: 'bn', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bN.svg' },
  { name: 'bb', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bB.svg' },
  { name: 'br', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bR.svg' },
  { name: 'bq', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bQ.svg' },
  { name: 'bk', url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bK.svg' },
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
