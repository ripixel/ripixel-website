import * as fs from 'fs';
import { Feed } from 'feed';

export const generateRssFeed = (
  articles: {
    title: string;
    link: string;
    excerpt: string;
    body: string;
    date: string;
    dateObj: Date;
    dateNum: number;
  }[]
): void => {
  const feed = new Feed({
    title: 'Ripixel (James King)',
    description: 'Feed for thoughts articles',
    id: 'https://www.ripixel.co.uk/',
    link: 'https://www.ripixel.co.uk/',
    language: 'en',
    favicon: 'https://www.ripixel.co.uk/favicon.ico',
    copyright: `All rights reserved ${new Date()
      .getFullYear()
      .toString()}, James King`,
    feedLinks: {
      json: 'https://example.com/json.json',
      atom: 'https://example.com/atom.xml',
    },
    author: {
      name: 'James King',
      email: 'ripixel+feed@gmail.com',
      link: 'https://www.ripixel.co.uk/',
    },
  });

  articles.forEach((article) => {
    feed.addItem({
      title: article.title,
      id: article.link,
      link: article.link,
      description: article.body,
      content: article.body,
      date: article.dateObj,
      author: [
        {
          name: 'James King',
          email: 'ripixel+feed@gmail.com',
          link: 'https://www.ripixel.co.uk/',
        },
      ],
    });
  });

  fs.writeFileSync('./public/rss.xml', feed.rss2(), 'utf8');
  fs.writeFileSync('./public/json.json', feed.json1(), 'utf8');
  fs.writeFileSync('./public/atom.xml', feed.atom1(), 'utf8');
};
