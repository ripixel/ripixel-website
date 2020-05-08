import * as fs from "fs";
import * as path from "path";

console.log("/// Beginning generation of pages");

const findInDir = (startPath: string, filter: string): string[] => {
  console.log(
    `Finding files in directory '${startPath}' containing '${filter}'`
  );
  if (!fs.existsSync(startPath)) {
    console.error("no dir " + startPath);
    return [];
  }

  let foundFiles: string[] = [];
  const files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      foundFiles = [...foundFiles, ...findInDir(filename, filter)]; //recurse
    } else if (filename.indexOf(filter) >= 0) {
      foundFiles.push(filename);
    }
  }

  console.log(`Found ${foundFiles.length} files`);
  return foundFiles;
};

const templates = findInDir("./templates", ".html");
const pages = findInDir("./pages", ".html");

pages.forEach((page) => {
  console.log(`Processing ${page}`);
  let pageContents = fs.readFileSync(page, "utf8");
  let pageName = page.replace("pages/", "").replace(".html", "");
  if (pageName === "index") {
    pageName = "home";
  }

  templates.forEach((template) => {
    const templateContents = fs
      .readFileSync(template, "utf8")
      .replace(new RegExp(`{page}`, "g"), pageName);

    templateContents;
    pageContents = pageContents.replace(
      new RegExp(`{${template.replace("templates/", "")}}`, "g"),
      templateContents
    );
  });

  fs.writeFileSync(page.replace("pages/", "public/"), pageContents, "utf8");
});

console.log("/// Finished generation of pages");
