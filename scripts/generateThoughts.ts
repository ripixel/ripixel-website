import * as fs from "fs";
import showdown from "showdown";
import showdownHighlight from "showdown-highlight";
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
    .replace(/{page}/g, "thoughts");

  thoughtsPageTemplateContents = thoughtsPageTemplateContents.replace(
    new RegExp(`{${template.replace("templates/", "")}}`, "g"),
    templateContents
  );
});

console.log(`Processing articles`);
const articles = findInDir("./thoughts/articles", ".md");

const mdConverter = new showdown.Converter({
  extensions: [showdownHighlight],
});

const articlesGenerated: Array<{
  title: string;
  link: string;
  body: string;
  date: string;
  dateNum: number;
}> = [];

articles.forEach((article) => {
  const articleWithoutFolder = article
    .replace("thoughts/articles/", "")
    .replace(".md", ".html");
  let [datestring, titleWithDash] = articleWithoutFolder
    .replace(".html", "")
    .split("_");
  const dateObj = new Date(datestring);
  const date = dateFormat(dateObj, "do LLL, u");
  const title = titleWithDash.replace(/-/g, " ");
  const body = mdConverter.makeHtml(fs.readFileSync(article, "utf8"));

  const splitBody = body.split("</p>");

  const articleContents = thoughtsPageTemplateContents
    .replace("{title}", title)
    .replace("{date}", date)
    .replace("{body}", body)
    .replace(/thoughts {subpage}/g, `${title}`)
    .replace(
      /{description}/g,
      `${splitBody[0]} ${splitBody[1]}`
        .replace(/\<(.*?)\>/g, "")
        .replace("\n", "")
    );

  console.log(`Found article ${title} published ${date}`);
  fs.writeFileSync(
    `public/thoughts/${articleWithoutFolder}`,
    articleContents,
    "utf8"
  );

  articlesGenerated.push({
    link: `${datestring}_${titleWithDash}`,
    title,
    date,
    dateNum: dateObj.valueOf(),
    body: `${splitBody[0]}</p>${splitBody[1]}</p>`,
  });
});

console.log(`Generated ${articlesGenerated.length} articles`);

console.log("Updating thoughts page proper");
let thoughtsPageContents = fs.readFileSync("./public/thoughts.html", "utf8");

const startRepPos = thoughtsPageContents.indexOf("<!--START_REP-->") + 16; // +16 for length of comment tag
const endRepPos = thoughtsPageContents.indexOf("<!--END_REP-->");

const repeatableBlock = thoughtsPageContents.substr(
  startRepPos,
  endRepPos - startRepPos
);

let blockToPaste = "";

articlesGenerated.sort((a, b) => b.dateNum - a.dateNum); // most-recent first

for (let i = 0; i < Math.min(2, articlesGenerated.length); i++) {
  blockToPaste =
    blockToPaste +
    `${repeatableBlock}`
      .replace(`{title}`, articlesGenerated[i].title)
      .replace(`{date}`, articlesGenerated[i].date)
      .replace(`{body}`, articlesGenerated[i].body)
      .replace(`{link}`, articlesGenerated[i].link);
}

thoughtsPageContents =
  `${thoughtsPageContents}`.substr(0, startRepPos) +
  blockToPaste +
  `${thoughtsPageContents}`.substr(
    endRepPos,
    thoughtsPageContents.length - endRepPos
  );

console.log("Updated thoughts page");

fs.writeFileSync("./public/thoughts.html", thoughtsPageContents, "utf8");

console.log("/// Finished generation of thoughts");
