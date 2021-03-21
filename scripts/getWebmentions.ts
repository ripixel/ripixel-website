/* eslint-disable @typescript-eslint/no-explicit-any */
import fetch from 'node-fetch';
import { URL } from 'url';

const WEBMENTION_BASE_URL = 'https://webmention.io/api/mentions.jf2';
const DOMAIN = 'www.ripixel.co.uk';
const WEBMENTION_IO_TOKEN = '09zN_zXeEJBP9eJPc_dDuw';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getWebmentions = async (): Promise<any[]> => {
  const url = `${WEBMENTION_BASE_URL}?domain=${DOMAIN}&token=${WEBMENTION_IO_TOKEN}&per-page=1000`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const feed = await res.json();
      return feed.children as any[];
    }
  } catch (err) {
    console.error(err);
    return [];
  }
  return [];
};

export const webmentionsForPage = (
  webmentions: any[],
  page: string
): {
  likes: any[];
  reposts: any[];
  comments: any[];
} => {
  const url = new URL(
    page.replace('.html', ''),
    `https://${DOMAIN}/`
  ).toString();

  const allowedTypes = {
    likes: ['like-of'],
    reposts: ['repost-of'],
    comments: ['mention-of', 'in-reply-to'],
  };

  const clean = (entry: any) => {
    if (entry.content) {
      if (entry.content.text.length > 280) {
        entry.content.value = `${entry.content.text.substr(0, 280)}&hellip;`;
      } else {
        entry.content.value = entry.content.text;
      }
    }
    return entry;
  };

  const cleanedWebmentions = webmentions
    .filter((mention) => mention['wm-target'] === url)
    .sort(
      (a, b) =>
        new Date(a.published).getTime() - new Date(b.published).getTime()
    )
    .map(clean);

  const likes = cleanedWebmentions
    .filter((mention) => allowedTypes.likes.includes(mention['wm-property']))
    .filter((like) => like.author)
    .map((like) => like.author);

  const reposts = cleanedWebmentions
    .filter((mention) => allowedTypes.reposts.includes(mention['wm-property']))
    .filter((repost) => repost.author)
    .map((repost) => repost.author);

  const comments = cleanedWebmentions
    .filter((mention) => allowedTypes.comments.includes(mention['wm-property']))
    .filter((comment) => {
      const { author, published, content } = comment;
      return author && author.name && published && content;
    });

  return {
    likes: likes ?? [],
    reposts: reposts ?? [],
    comments: comments ?? [],
  };
};
