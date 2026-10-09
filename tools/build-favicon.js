/**
 * Ensambla un archivo .ico (formato ICO con PNG embebido) a partir de los PNG
 * ya generados en public/. Sin dependencias externas.
 *
 * Uso: node tools/build-favicon.js
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const entries = [
  { file: 'lane-32.png', size: 32 },
  { file: 'lane-180.png', size: 180 },
  { file: 'lane-192.png', size: 192 }
];

const images = entries.map((entry) => {
  const buffer = fs.readFileSync(path.join(publicDir, entry.file));
  return { ...entry, buffer };
});

const HEADER_SIZE = 6;
const ENTRY_SIZE = 16;
const directorySize = HEADER_SIZE + images.length * ENTRY_SIZE;

const header = Buffer.alloc(HEADER_SIZE);
header.writeUInt16LE(0, 0); // reservado
header.writeUInt16LE(1, 2); // tipo: icono
header.writeUInt16LE(images.length, 4);

const directory = Buffer.alloc(images.length * ENTRY_SIZE);

let offset = directorySize;
images.forEach((image, index) => {
  const base = index * ENTRY_SIZE;
  // 256 se codifica como 0
  directory.writeUInt8(image.size >= 256 ? 0 : image.size, base + 0);
  directory.writeUInt8(image.size >= 256 ? 0 : image.size, base + 1);
  directory.writeUInt8(0, base + 2); // paleta
  directory.writeUInt8(0, base + 3); // reservado
  directory.writeUInt16LE(1, base + 4); // planos
  directory.writeUInt16LE(32, base + 6); // bits por pixel
  directory.writeUInt32LE(image.buffer.length, base + 8);
  directory.writeUInt32LE(offset, base + 12);
  offset += image.buffer.length;
});

const ico = Buffer.concat([header, directory, ...images.map((i) => i.buffer)]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

console.log(`favicon.ico generado (${(ico.length / 1024).toFixed(1)} KB, ${images.length} tamanos)`);