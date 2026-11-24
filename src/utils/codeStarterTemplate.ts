// utilitas pembuat kerangka kode wajib dan placeholder editor pemrograman
export function getStarterCodePlaceholder(
  language?: string,
  existingStarterCode?: string,
  topicTitle?: string,
  rawContent?: string
): string {
  // jika admin telah menyetel starter_code khusus yang valid gunakan starter_code tersebut
  if (existingStarterCode && existingStarterCode.trim().length > 0) {
    return existingStarterCode.trim() + "\n";
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
    // kerjakan kode program c++ anda di sini sesuai instruksi materi
    
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
    return `# kerjakan kode program python anda di sini sesuai instruksi materi

def main():
    # tuliskan instruksi dan logika program di sini
    pass

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
    <title>Praktik Pemrograman Web</title>
    <style>
        /* tuliskan styling css anda di sini */
        body {
            font-family: sans-serif;
            margin: 20px;
        }
    </style>
</head>
<body>
    <!-- tuliskan struktur elemen html anda di sini -->
    <h1>Praktik Web Skillora</h1>
    
    <script>
        // tuliskan logika javascript anda di sini
        console.log("Halaman berhasil dijalankan");
    </script>
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
    return `// kerjakan kode program javascript anda di sini sesuai materi

function main() {
    // tuliskan logika kode program di sini
}

main();
`;
  }

  // bahasa java
  if (lang === "java" || title.includes("java")) {
    return `public class Main {
    public static void main(String[] args) {
        // kerjakan kode program java anda di sini
        
    }
}
`;
  }

  // default kerangka cpp umum untuk praktikum algoritma dan pemrograman
  return `#include <iostream>
using namespace std;

int main() {
    // kerjakan kode program anda di sini sesuai instruksi materi
    
    return 0;
}
`;
}

