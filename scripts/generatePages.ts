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

  let description = "I'm James King, and I make things for the web";
  switch (pageName) {
    case "thoughts":
      description = "A peak inside my brain you ask? Reader, beware...";
      break;
    case "profile":
      description =
        "So who am I? I'm James King, a 27 year old Software Engineer from Lincolnshire. You want some more info?";
      break;
    case "coding":
      description = "Shall we take a look at some projects I've done?";
      break;
    case "changelog":
      description = "What changes have happened to this site?";
      break;
    default:
    // do nothing - already set description for home/index
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
      .replace(/{subpage}/g, "")
      .replace(/{description}/g, description);
  });

  fs.writeFileSync(page.replace("pages/", "public/"), pageContents, "utf8");
});

console.log("/// Finished generation of pages");
