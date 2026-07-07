import sharp from "sharp";

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#0B0B0B"/>
  <rect x="40" y="40" width="432" height="432" rx="92" stroke="#7F1D1D" stroke-width="16"/>
  <path d="M142 364V132H264C314.81 132 348 164.25 348 209.5C348 256.75 313.94 288 261.5 288H198V364H142ZM198 240H254C276.75 240 291 228.75 291 210.5C291 192.25 276.75 181 254 181H198V240Z" fill="#F2F1EC"/>
  <path d="M348 364L298 286H359L414 364H348Z" fill="#7F1D1D"/>
</svg>
`;

const buffer = Buffer.from(svg);

await sharp(buffer).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(buffer).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(buffer).resize(180, 180).png().toFile("public/apple-touch-icon.png");

console.log("Paranoid icons generated.");