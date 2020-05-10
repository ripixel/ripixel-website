import * as fs from "fs";
import showdown from "showdown";
import { format as dateFormat } from "date-fns";

import findInDir from "./findInDir";

console.log("/// Beginning generation of thoughts");

const templates = findInDir("./templates", ".html");

console.log(`Processing initial thoughts page template`);
let thoughtsPageTemplateContents = fs.readFileSync(
  "./thoughts/template.html",
  "utf8"
);

templates.forEach((template) => {
  const templateContents = fs
    .readFileSync(template, "utf8")
    .replace(new RegExp(`{page}`, "g"), "thoughts");

  thoughtsPageTemplateContents = thoughtsPageTemplateContents.replace(
    new RegExp(`{${template.replace("templates/", "")}}`, "g"),
    templateContents
  );
});

console.log(`Processing articles`);
const articles = findInDir("./thoughts/articles", ".md");

const mdConverter = new showdown.Converter();

const articlesGenerated = [];

articles.forEach((article) => {
  const articleWithoutFolder = article
    .replace("thoughts/articles/", "")
    .replace(".md", ".html");
  let [datestring, title] = articleWithoutFolder
    .replace(".html", "")
    .split("_");
  const date = dateFormat(new Date(datestring), "do LLL, u");
  title = title.replace(/-/g, " ");
  const body = mdConverter.makeHtml(fs.readFileSync(article, "utf8"));

  const articleContents = thoughtsPageTemplateContents
    .replace("{title}", title)
    .replace("{date}", date)
    .replace("{body}", body)
    .replace("thoughts {subpage}", `${title}`);
  console.log(`Found article ${title} published ${date}`);
  fs.writeFileSync(
    `public/thoughts/${articleWithoutFolder}`,
    articleContents,
    "utf8"
  );

  articlesGenerated.push({
    title,
    date,
    body,
  });
});

console.log(`Generated ${articlesGenerated.length} articles`);

console.log("/// Finished generation of thoughts");
