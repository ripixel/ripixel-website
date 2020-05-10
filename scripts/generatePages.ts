import * as fs from "fs";

import findInDir from "./findInDir";

console.log("/// Beginning generation of pages");

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

    pageContents = pageContents
      .replace(
        new RegExp(`{${template.replace("templates/", "")}}`, "g"),
        templateContents
      )
      .replace("{subpage}", "");
  });

  fs.writeFileSync(page.replace("pages/", "public/"), pageContents, "utf8");
});

console.log("/// Finished generation of pages");
