export function pemToDer(pem: string): Uint8Array {
   const lines = pem.split(/\r?\n/);
   const base64 = lines.filter((line) => !line.startsWith("-----")).join("");
   const binary = atob(base64);
   const bytes = new Uint8Array(binary.length);
   for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
   }
   return bytes;
}

export function derToPem(der: Uint8Array, label: string): string {
   let binary = "";
   for (const byte of der) {
      binary += String.fromCharCode(byte);
   }
   const base64 = btoa(binary);
   const lines: string[] = [];
   lines.push(`-----BEGIN ${label}-----`);
   for (let i = 0; i < base64.length; i += 64) {
      lines.push(base64.slice(i, i + 64));
   }
   lines.push(`-----END ${label}-----`);
   return lines.join("\n");
}
