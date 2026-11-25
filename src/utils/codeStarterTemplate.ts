// utilitas pembuat kerangka kode wajib placeholder dinamis dan validator kecocokan latihan pemrograman

// fungsi pembuat target kode acuan yang harus ditulis ulang oleh peserta
export function getTargetPracticeCode(
  language?: string,
  existingStarterCode?: string,
  topicTitle?: string,
  rawContent?: string,
  studentName?: string
): string {
  const displayName = studentName?.trim() || "Mahasiswa";

  // jika admin menyetel starter code khusus dengan placeholder dinamis
  if (existingStarterCode && existingStarterCode.trim().length > 0) {
    let replaced = existingStarterCode.trim();
    replaced = replaced.replace(/{{\s*(?:name|nama)\s*}}/gi, displayName);
    replaced = replaced.replace(/\[\s*(?:nama anda|tulis nama anda di sini|nama)\s*\]/gi, displayName);
    return replaced + "\n";
  }

  const lang = (language || "").toLowerCase();
  const title = (topicTitle || "").toLowerCase();
  const content = (rawContent || "").toLowerCase();

  // bahasa c++ atau c
  if (
    lang === "cpp" ||
    lang === "c" ||
    lang === "c++" ||
    title.includes("c++") ||
    title.includes("cpp") ||
    content.includes("#include")
  ) {
    return `#include <iostream>
using namespace std;

int main() {
    cout << "Halo, nama saya " << "${displayName}" << "!" << endl;
    cout << "Saya sedang belajar dasar pemrograman di Skillora." << endl;
    return 0;
}
`;
  }

  // bahasa python
  if (
    lang === "python" ||
    lang === "py" ||
    title.includes("python") ||
    content.includes("def ")
  ) {
    return `def main():
    nama = "${displayName}"
    print(f"Halo, nama saya {nama}!")
    print("Selamat belajar pemrograman di Skillora.")

if __name__ == "__main__":
    main()
`;
  }

  // web html css dan javascript
  if (
    lang === "web" ||
    lang === "html" ||
    title.includes("html") ||
    title.includes("web") ||
    content.includes("<html") ||
    content.includes("<!doctype")
  ) {
    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Praktik Web - ${displayName}</title>
    <style>
        body {
            font-family: sans-serif;
            margin: 20px;
        }
    </style>
</head>
<body>
    <h1>Halo, saya ${displayName}</h1>
    <p>Selamat datang di platform pembelajaran Skillora.</p>
</body>
</html>
`;
  }

  // bahasa javascript murni
  if (
    lang === "javascript" ||
    lang === "js" ||
    title.includes("javascript") ||
    title.includes("node")
  ) {
    return `function main() {
    const nama = "${displayName}";
    console.log("Halo, nama saya " + nama + "!");
    console.log("Selamat belajar pemrograman di Skillora.");
}

main();
`;
  }

  // bahasa java
  if (lang === "java" || title.includes("java")) {
    return `public class Main {
    public static void main(String[] args) {
        System.out.println("Halo, nama saya ${displayName}!");
        System.out.println("Selamat belajar pemrograman di Skillora.");
    }
}
`;
  }

  // default kerangka cpp umum
  return `#include <iostream>
using namespace std;

int main() {
    cout << "Halo, nama saya " << "${displayName}" << "!" << endl;
    cout << "Saya sedang belajar dasar pemrograman di Skillora." << endl;
    return 0;
}
`;
}

// fungsi pembuat kerangka kode awal placeholder di dalam editor
export function getStarterCodePlaceholder(
  language?: string,
  existingStarterCode?: string,
  topicTitle?: string,
  rawContent?: string,
  studentName?: string
): string {
  // jika admin menyetel starter code khusus gunakan starter code tersebut
  if (existingStarterCode && existingStarterCode.trim().length > 0) {
    let codeStr = existingStarterCode.trim();
    codeStr = codeStr.replace(/{{\s*(?:name|nama)\s*}}/gi, "[Tuliskan Nama Anda Di Sini]");
    return codeStr + "\n";
  }

  const lang = (language || "").toLowerCase();
  const title = (topicTitle || "").toLowerCase();
  const content = (rawContent || "").toLowerCase();

  // bahasa c++ atau c
  if (
    lang === "cpp" ||
    lang === "c" ||
    lang === "c++" ||
    title.includes("c++") ||
    title.includes("cpp") ||
    content.includes("#include")
  ) {
    return `#include <iostream>
using namespace std;

int main() {
    // tuliskan ulang baris kode di bawah ini dan isi dengan nama anda
    cout << "Halo, nama saya " << "[Tuliskan Nama Anda Di Sini]" << "!" << endl;
    cout << "Saya sedang belajar dasar pemrograman di Skillora." << endl;
    return 0;
}
`;
  }

  // bahasa python
  if (
    lang === "python" ||
    lang === "py" ||
    title.includes("python") ||
    content.includes("def ")
  ) {
    return `# tuliskan ulang kode program berikut dan isi nilai nama anda sendiri
def main():
    nama = "[Tuliskan Nama Anda Di Sini]"
    print(f"Halo, nama saya {nama}!")
    print("Selamat belajar pemrograman di Skillora.")

if __name__ == "__main__":
    main()
`;
  }

  // web html css dan javascript
  if (
    lang === "web" ||
    lang === "html" ||
    title.includes("html") ||
    title.includes("web") ||
    content.includes("<html") ||
    content.includes("<!doctype")
  ) {
    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Praktik Web - [Tuliskan Nama Anda Di Sini]</title>
    <style>
        body {
            font-family: sans-serif;
            margin: 20px;
        }
    </style>
</head>
<body>
    <!-- tuliskan ulang struktur html berikut dan cantumkan nama anda -->
    <h1>Halo, saya [Tuliskan Nama Anda Di Sini]</h1>
    <p>Selamat datang di platform pembelajaran Skillora.</p>
</body>
</html>
`;
  }

  // bahasa javascript murni
  if (
    lang === "javascript" ||
    lang === "js" ||
    title.includes("javascript") ||
    title.includes("node")
  ) {
    return `// tuliskan ulang fungsi berikut dan cantumkan nama anda sendiri
function main() {
    const nama = "[Tuliskan Nama Anda Di Sini]";
    console.log("Halo, nama saya " + nama + "!");
    console.log("Selamat belajar pemrograman di Skillora.");
}

main();
`;
  }

  // bahasa java
  if (lang === "java" || title.includes("java")) {
    return `public class Main {
    public static void main(String[] args) {
        // tuliskan ulang baris output berikut dan cantumkan nama anda
        System.out.println("Halo, nama saya [Tuliskan Nama Anda Di Sini]!");
        System.out.println("Selamat belajar pemrograman di Skillora.");
    }
}
`;
  }

  // default kerangka cpp umum
  return `#include <iostream>
using namespace std;

int main() {
    // tuliskan ulang baris kode di bawah ini dan isi dengan nama anda
    cout << "Halo, nama saya " << "[Tuliskan Nama Anda Di Sini]" << "!" << endl;
    cout << "Saya sedang belajar dasar pemrograman di Skillora." << endl;
    return 0;
}
`;
}

// normalisasi token kode program untuk kalkulasi kesesuaian struktur
function tokenizeCodeForMatching(code: string, dynamicValues: string[] = []): string[] {
  if (!code) return [];
  // hilangkan komentar baris tunggal dan multibaris
  const clean = code
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/#[^\n]*/g, "");

  // normalisasi string literals agar nilai dinamis seperti nama peserta terdeteksi cocok
  const stringRegex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g;
  const normalizedStrings = clean.replace(stringRegex, (strMatch) => {
    const rawInside = strMatch.slice(1, -1).trim();
    if (!rawInside) return '""';

    const isDynamic =
      dynamicValues.some(
        (val) =>
          val &&
          (rawInside.toLowerCase().includes(val.toLowerCase()) ||
            val.toLowerCase().includes(rawInside.toLowerCase()))
      ) || /nama|name|placeholder|tulis|anda/i.test(rawInside);

    return isDynamic ? '"__DYNAMIC_VALUE__"' : strMatch;
  });

  // pecah token berdasarkan karakter pemisah
  return normalizedStrings
    .replace(/([{}()\[\];,\.<>+\-*\/%=!&|^~:])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
}

// hitung persentase kesesuaian penulisan ulang kode peserta terhadap target acuan
export function calculateCodeMatch(
  writtenCode: string,
  targetCode: string,
  dynamicValues: string[] = []
): { matchPercentage: number; isMatched: boolean } {
  if (!targetCode || !targetCode.trim()) {
    return { matchPercentage: 100, isMatched: true };
  }

  const writtenTokens = tokenizeCodeForMatching(writtenCode, dynamicValues);
  const targetTokens = tokenizeCodeForMatching(targetCode, dynamicValues);

  if (targetTokens.length === 0) {
    return { matchPercentage: 100, isMatched: true };
  }

  if (writtenTokens.length === 0) {
    return { matchPercentage: 0, isMatched: false };
  }

  // pastikan peserta telah mengganti placeholder instruksi dengan nilai aktual mereka
  const hasUnfilledPlaceholder = /\[\s*tuliskan nama anda di sini\s*\]/i.test(writtenCode);
  if (hasUnfilledPlaceholder) {
    return { matchPercentage: 40, isMatched: false };
  }

  let matchedCount = 0;
  let searchIdx = 0;

  for (let t = 0; t < targetTokens.length; t++) {
    const targetToken = targetTokens[t];
    // cari token yang sesuai dalam rentang jendela kursor berikutnya
    for (let w = searchIdx; w < Math.min(writtenTokens.length, searchIdx + 6); w++) {
      const writtenToken = writtenTokens[w];
      const tokenMatches =
        writtenToken === targetToken ||
        (targetToken === '"__DYNAMIC_VALUE__"' && /^["'].*["']$/.test(writtenToken));

      if (tokenMatches) {
        matchedCount++;
        searchIdx = w + 1;
        break;
      }
    }
  }

  const ratio = matchedCount / targetTokens.length;
  const matchPercentage = Math.min(100, Math.round(ratio * 100));
  const isMatched = matchPercentage >= 80;

  return { matchPercentage, isMatched };
}
