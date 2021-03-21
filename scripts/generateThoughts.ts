import * as fs from 'fs';
import showdown from 'showdown';
import showdownHighlight from 'showdown-highlight';
import { format as dateFormat } from 'date-fns';

import findInDir from './findInDir';
import { getWebmentions, webmentionsForPage } from './getWebmentions';
import { generateRssFeed } from './generateRssFeed';

const ARTICLES_TO_SHOW = 5;

const generateWebmentionBlock = (
  tag: 'COMMENTS' | 'LIKES' | 'REPOSTS',
  content: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mentions: any[]
): string => {
  const startBlockTag = `<!-- START_${tag} -->`;
  const endBlockTag = `<!-- END_${tag} -->`;
  const startBlockPos = content.indexOf(startBlockTag) + startBlockTag.length;
  const endBlockPos = content.indexOf(endBlockTag);

  const mentionBlock = content.substr(
    startBlockPos,
    endBlockPos - startBlockPos
  );

  let blockToPaste = '';

  if (mentions.length > 0) {
    const repBlocks: string[] = [];

    const startRepBlockTag = `<!-- START_${tag}_REP -->`;
    const endRepBlockTag = `<!-- END_${tag}_REP -->`;
    const startRepBlockPos =
      mentionBlock.indexOf(startRepBlockTag) + startRepBlockTag.length;
    const endRepBlockPos = mentionBlock.indexOf(endRepBlockTag);

    const mentionRepBlock = mentionBlock.substr(
      startRepBlockPos,
      endRepBlockPos - startRepBlockPos
    );

    const isComment = tag === 'COMMENTS';

    mentions.slice(0, 19).forEach((mention) => {
      repBlocks.push(
        mentionRepBlock
          .replace(
            /{mention_link}/g,
            !isComment ? mention.url : mention.author.url
          )
          .replace(
            /{mention_avatar}/g,
            (!isComment ? mention.photo : mention.author.photo) ??
              '/default_avatar.png'
          )
          .replace(
            /{mention_name}/g,
            !isComment ? mention.name : mention.author.name
          )
          .replace(/{comment}/g, isComment ? mention.content.value : '')
          .replace(/{comment_link}/g, isComment ? mention.url : '')
      );
    });

    blockToPaste =
      `${mentionBlock}`.substr(0, startRepBlockPos) +
      repBlocks.join('') +
      `${mentionBlock}`.substr(
        endRepBlockPos,
        mentionBlock.length - endRepBlockPos
      );
  }

  return (
    `${content}`.substr(0, startBlockPos) +
    blockToPaste.replace(
      `{${tag}}`,
      `${mentions.length > 19 ? '19+' : mentions.length}`
    ) +
    `${content}`.substr(endBlockPos, content.length - endBlockPos)
  );
};

const generateWebmentions = (
  webmentions: unknown[],
  page: string,
  preWebmentionsArticleContents: string
): string => {
  const { likes, comments, reposts } = webmentionsForPage(
    webmentions,
    `thoughts/${page}`
  );

  if (likes.length === 0 && comments.length === 0 && reposts.length === 0) {
    const startBlockTag = `<!-- START_MENTIONS -->`;
    const endBlockTag = `<!-- END_MENTIONS -->`;
    const startBlockPos =
      preWebmentionsArticleContents.indexOf(startBlockTag) +
      startBlockTag.length;
    const endBlockPos = preWebmentionsArticleContents.indexOf(endBlockTag);

    return (
      `${preWebmentionsArticleContents}`.substr(0, startBlockPos) +
      `${preWebmentionsArticleContents}`.substr(
        endBlockPos,
        preWebmentionsArticleContents.length - endBlockPos
      )
    );
  }

  const contentAfterLikes = generateWebmentionBlock(
    'LIKES',
    preWebmentionsArticleContents,
    likes
  );

  const contentAfterComments = generateWebmentionBlock(
    'COMMENTS',
    contentAfterLikes,
    comments
  );

  const conentAfterReposts = generateWebmentionBlock(
    'REPOSTS',
    contentAfterComments,
    reposts
  );

  return conentAfterReposts;
};

const generateThoughts = async (): Promise<void> => {
  // console.log('/// Beginning generation of thoughts');

  const partials = findInDir('./partials', '.html');

  // console.log(`Processing initial thoughts page template`);
  let thoughtsPageTemplateContents = fs.readFileSync(
    './thoughts/template.html',
    'utf8'
  );

  partials.forEach((template) => {
    const templateContents = fs
      .readFileSync(template, 'utf8')
      .replace(/{page}/g, 'thoughts');

    thoughtsPageTemplateContents = thoughtsPageTemplateContents.replace(
      new RegExp(`{${template.replace('partials/', '')}}`, 'g'),
      templateContents
    );
  });

  // console.log(`Processing articles`);
  const articles = findInDir('./thoughts/articles', '.md');

  const mdConverter = new showdown.Converter({
    extensions: [showdownHighlight],
  });

  const articlesGenerated: Array<{
    title: string;
    link: string;
    excerpt: string;
    body: string;
    date: string;
    dateObj: Date;
    dateNum: number;
  }> = [];

  const webmentions = await getWebmentions();

  articles.forEach((article) => {
    const articleWithoutFolder = article
      .replace('thoughts/articles/', '')
      .replace('.md', '.html');
    // console.log(`Processing article ${articleWithoutFolder}`);
    const [datestring, titleWithDash] = articleWithoutFolder
      .replace('.html', '')
      .split('_');
    const dateObj = new Date(datestring);
    const date = dateFormat(dateObj, 'do LLL, u');
    const title = titleWithDash.replace(/-/g, ' ');
    const body = mdConverter.makeHtml(fs.readFileSync(article, 'utf8'));

    const splitBody = body.split('</p>');

    const preWebmentionsArticleContents = thoughtsPageTemplateContents
      .replace('{title}', title)
      .replace('{date}', date)
      .replace('{body}', body)
      .replace(/thoughts {subpage}/g, `${title}`)
      .replace(
        /{description}/g,
        `${splitBody[0]} ${splitBody[1]}`
          .replace(/<(.*?)>/g, '')
          .replace('\n', '')
      )
      .replace(/{year}/g, new Date().getFullYear().toString())
      .replace(
        /{noindex}/g,
        process.env.NODE_ENV === 'development'
          ? '<meta name="robots" content="noindex" />'
          : ''
      );

    const articleContents = generateWebmentions(
      webmentions,
      articleWithoutFolder,
      preWebmentionsArticleContents
    );

    // console.log(`Found article ${title} published ${date}`);
    fs.writeFileSync(
      `public/thoughts/${articleWithoutFolder}`,
      articleContents,
      'utf8'
    );

    articlesGenerated.push({
      link: `${datestring}_${titleWithDash}`,
      title,
      date,
      dateObj,
      dateNum: dateObj.valueOf(),
      body,
      excerpt: `${splitBody[0]}</p>${splitBody[1]}</p>`,
    });
  });

  // console.log(`Generated ${articlesGenerated.length} articles`);

  // console.log('Updating thoughts page proper');
  let thoughtsPageContents = fs.readFileSync('./public/thoughts.html', 'utf8');

  const startTag = '<!--START_REP-->';
  const endTag = '<!--END_REP-->';
  const startRepPos = thoughtsPageContents.indexOf(startTag) + startTag.length;
  const endRepPos = thoughtsPageContents.indexOf(endTag);

  const repeatableBlock = thoughtsPageContents.substr(
    startRepPos,
    endRepPos - startRepPos
  );

  let blockToPaste = '';

  articlesGenerated.sort((a, b) => b.dateNum - a.dateNum); // most-recent first

  for (
    let i = 0;
    i < Math.min(ARTICLES_TO_SHOW, articlesGenerated.length);
    i++
  ) {
    blockToPaste =
      blockToPaste +
      `${repeatableBlock}`
        .replace(`{title}`, articlesGenerated[i].title)
        .replace(`{date}`, articlesGenerated[i].date)
        .replace(`{body}`, articlesGenerated[i].excerpt)
        .replace(`{link}`, articlesGenerated[i].link);
  }

  thoughtsPageContents =
    `${thoughtsPageContents}`.substr(0, startRepPos) +
    blockToPaste +
    `${thoughtsPageContents}`.substr(
      endRepPos,
      thoughtsPageContents.length - endRepPos
    );

  // console.log('Updated thoughts page');

  fs.writeFileSync('./public/thoughts.html', thoughtsPageContents, 'utf8');

  generateRssFeed(articlesGenerated);

  // console.log('/// Finished generation of thoughts');
};

export default generateThoughts;
