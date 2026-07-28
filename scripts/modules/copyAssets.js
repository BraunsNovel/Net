import fs from 'fs';
import path from 'path';

export function copyAssets(srcDir, adminDir, staticDir, distDir) {
  if (fs.existsSync(srcDir)) fs.cpSync(srcDir, distDir, { recursive: true });
  if (fs.existsSync(adminDir)) fs.cpSync(adminDir, path.join(distDir, 'admin'), { recursive: true });
  if (fs.existsSync(staticDir)) fs.cpSync(staticDir, distDir, { recursive: true });
  console.log('✅ Statik dosyalar kopyalandı.');
}
