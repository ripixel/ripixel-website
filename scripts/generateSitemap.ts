import * as fs from "fs";
import { js2xml } from "xml-js";

import findInDir from "./findInDir";

const SITE_ROOT = "https://www.ripixel.co.uk/";

console.log("/// Beginning sitemap generation");

const generatedPages = findInDir("./public", ".html")
  .filter((page) => page !== "public/404.html" && page !== "public/index.html")
  .map((page) => page.replace("public/", "").replace(".html", ""));

console.log(
  `Found ${generatedPages.length} public pages (not including index or 404)`
);

const generateUrlElement = (loc: string) => {
  return {
    type: "element",
    name: "url",
    elements: [
      {
        type: "element",
        name: "loc",
        elements: [
          {
            type: "text",
            text: loc,
          },
        ],
      },
      {
        type: "element",
        name: "lastmod",
        elements: [
          {
            type: "text",
            text: new Date().toISOString().split("T")[0],
          },
        ],
      },
      {
        type: "element",
        name: "changefreq",
        elements: [
          {
            type: "text",
            text: loc === SITE_ROOT ? "monthly" : "weekly",
          },
        ],
      },
      {
        type: "element",
        name: "priority",
        elements: [
          {
            type: "text",
            text: loc === SITE_ROOT ? "1.0" : "0.5",
          },
        ],
      },
    ],
  };
};

const sitemapJs = {
  declaration: {
    attributes: {
      version: "1.0",
      encoding: "utf-8",
    },
  },
  elements: [
    {
      type: "element",
      name: "urlset",
      attributes: {
        xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
      },
      elements: [generateUrlElement(SITE_ROOT)],
    },
  ],
};

generatedPages.forEach((page) => {
  sitemapJs.elements[0].elements.push(generateUrlElement(SITE_ROOT + page));
});

const sitemapXml = js2xml(sitemapJs, { spaces: 4 });

fs.writeFileSync("./public/sitemap.xml", sitemapXml, "utf8");

console.log("/// Finished sitemap generation");
