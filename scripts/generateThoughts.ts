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

const articlesGenerated: Array<{
  title: string;
  link: string;
  body: string;
  date: string;
}> = [];

articles.forEach((article) => {
  const articleWithoutFolder = article
    .replace("thoughts/articles/", "")
    .replace(".md", ".html");
  let [datestring, titleWithDash] = articleWithoutFolder
    .replace(".html", "")
    .split("_");
  const date = dateFormat(new Date(datestring), "do LLL, u");
  const title = titleWithDash.replace(/-/g, " ");
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

  const splitBody = body.split("</p>");

  articlesGenerated.push({
    link: `${datestring}_${titleWithDash}`,
    title,
    date,
    body: `${splitBody[0]}</p>${splitBody[1]}</p>`,
  });
});

console.log(`Generated ${articlesGenerated.length} articles`);

console.log("Updating thoughts page proper");
let thoughtsPageContents = fs.readFileSync("./public/thoughts.html", "utf8");

for (let i = 0; i < Math.min(2, articlesGenerated.length); i++) {
  thoughtsPageContents = thoughtsPageContents
    .replace(`{title${i}}`, articlesGenerated[i].title)
    .replace(`{date${i}}`, articlesGenerated[i].date)
    .replace(`{body${i}}`, articlesGenerated[i].body)
    .replace(`{link${i}}`, articlesGenerated[i].link);
}

console.log("Updated thoughts page");

fs.writeFileSync("./public/thoughts.html", thoughtsPageContents, "utf8");

console.log("/// Finished generation of thoughts");
