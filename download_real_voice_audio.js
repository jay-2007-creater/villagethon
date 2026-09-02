const fs = require('fs');
const path = require('path');
const https = require('https');

const audioDir = path.join(__dirname, 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

function downloadTts(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed with status code: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function main() {
  const tasks = [
    {
      name: 'voice_alert_english.mp3',
      text: 'Attention resident: Municipal waste collection vehicle is approaching your street in 2 minutes! Please keep your segregated dry and wet waste bins ready.',
      lang: 'en'
    },
    {
      name: 'voice_alert_hindi.mp3',
      text: 'ध्यान दें नागरिक! महानगरपालिका की कचरा गाड़ी 2 मिनट में आ रही है। कृपया सूखा और गीला कचरा अलग रखें।',
      lang: 'hi'
    },
    {
      name: 'voice_alert_marathi.mp3',
      text: 'लक्ष द्या नागरिक! महानगरपालिकेची कचरा गाडी २ मिनिटात येत आहे. कृपया ओला आणि सुका कचरा वेगळा ठेवा.',
      lang: 'mr'
    }
  ];

  for (const t of tasks) {
    const encoded = encodeURIComponent(t.text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${t.lang}&client=tw-ob`;
    const targetFile = path.join(audioDir, t.name);
    try {
      console.log(`Downloading generic spoken audio for ${t.lang}...`);
      await downloadTts(url, targetFile);
      console.log(`✓ Saved ${t.name} (${fs.statSync(targetFile).size} bytes)`);
    } catch (e) {
      console.warn(`Failed to download ${t.name}:`, e.message);
    }
  }
}

main();
