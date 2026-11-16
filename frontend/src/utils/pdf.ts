/**
 * Minimal, dependency-free print-ready PDF generator.
 * Embeds a JPEG image on a page sized exactly to widthIn x heightIn inches
 * (MediaBox in points), so physical dimensions and DPI are accurate.
 */
export function exportPrintPdf(
  jpegDataUrl: string,
  widthIn: number,
  heightIn: number,
  fileName: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const pageW = Math.round(widthIn * 72);
        const pageH = Math.round(heightIn * 72);
        const jpegB64 = jpegDataUrl.split(',')[1];
        const jpegStr = atob(jpegB64);
        const jpegBytes = new Uint8Array(jpegStr.length);
        for (let i = 0; i < jpegStr.length; i++) jpegBytes[i] = jpegStr.charCodeAt(i);

        const offsets: number[] = [0]; // entry 0 = free
        let pos = 0;
        const parts: Uint8Array[] = [];
        const add = (str: string) => {
          offsets.push(pos);
          const b = new TextEncoder().encode(str);
          parts.push(b);
          pos += b.length;
        };
        const addBytes = (b: Uint8Array) => {
          offsets.push(pos);
          parts.push(b);
          pos += b.length;
        };

        add('%PDF-1.4\n');
        add('1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n');
        add('2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1/MediaBox[0 0 ' + pageW + ' ' + pageH + ']>>endobj\n');
        add('3 0 obj<</Type/Page/Parent 2 0 R/Resources<</XObject<</Im1 4 0 R>>>>/Contents 5 0 R>>endobj\n');
        add(
          '4 0 obj<</Type/XObject/Subtype/Image/Width ' +
            iw +
            '/Height ' +
            ih +
            '/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ' +
            jpegBytes.length +
            '>>stream\n',
        );
        addBytes(jpegBytes);
        add('\nendstream endobj\n');
        add('5 0 obj<</Length 0>>stream\nendstream endobj\n');

        const xrefOffset = pos;
        add('xref\n');
        add('0 ' + offsets.length + '\n');
        add('0000000000 65535 f \n');
        for (let i = 1; i < offsets.length; i++) {
          add(offsets[i].toString().padStart(10, '0') + ' 00000 n \n');
        }
        add('trailer<</Size ' + offsets.length + '/Root 1 0 R>>\n');
        add('startxref\n' + xrefOffset + '\n');
        add('%%EOF\n');

        const buf = new Uint8Array(pos);
        let o = 0;
        for (const p of parts) { buf.set(p, o); o += p.length; }

        const blob = new Blob([buf], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = jpegDataUrl;
  });
}
