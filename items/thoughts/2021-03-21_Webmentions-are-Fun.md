Ever wondered if there's some way to let people know you think their web article/content is great, but also wanted it to be automated and snazzy?

Enter [Webmentions](https://indieweb.org/Webmention), the cool little system to notify (and receive notifications about) people you liked/reposted/commented on their stuff! You can even hook it up to Twitter, and it's completely agnostic of whatever system you use to publish your little corner of the web.

## So how do they work?

Simply put, you have some service that accepts a request that you've been mentioned, and you yourself poke other services to let other people know that you've been mentioned.

That second bit sounds like it could be an absolute nightmare to figure out right? Wrong! The [Webmentions Spec](https://www.w3.org/TR/webmention/) has thought of this, and all you do is add some tags to your head to let people know whe to send mention requests (more on that in the [tutorial](#justshowmehowtodoitimhereforthecode) section).

So when you want to mention someone, you scrape the page you're mentioning, find the `webmention` link tag and fire your request there - easy!

But how about when you want to find out what you've been mentioned in? Well that depends on what service you use to accept your mention requests, but generally you'll just poke an API endpoint to retrieve them, et voila! You have all your webmentions, and you can do with them what you will (for example, I shove them at the end of an article).

## Just show me how to do it, I'm here for the code!

Ok, so first things first, we've got to decide how to accept webmentions. For this entire guide, I'll be effectively using the process that [Luke Bonaccorsi](https://lukeb.co.uk/) noted in his excellent article ["No comment: Adding Webmentions to my site"](https://lukeb.co.uk/blog/2021/03/15/no-comment-adding-webmentions-to-my-site/#webmentions) (and because I've mentioned his article in mine, he'll get a webmention ping - neat!). He uses Eleventy and thus a slightly different integration path (he even made a build-plugin for it to make all this process super easy for everyone using Eleventy), but I've shamelessly copy/pasted his code here. Go give him a yell on Twitter [@CodeFoodPixels](https://twitter.com/CodeFoodPixels) telling him how great he is!

Ok, with that gushing out the way, we're going to use [webmention.io](https://webmention.io/) to receive mentions for us, and [webmention.app](https://webmention.app/) to send mentions to other people.

### Accepting webmentions

To get started accepting webmentions with .io, we've got to let it know we are responsible for that site. So you need to do two things.

Firstly, ensure that your website is on the profile of one of the sign on mechanisms they support, so for me that was Twitter or GitHub. Then you need to add `rel="me"` to a link to that profile on your website, for example:

```html
<!-- HTML -->

<a href="https://github.com/your_gh_username" rel="me">GitHub</a>
<a href="https://www.twitter.com/your_twitter_handle" rel="me">Twitter</a>
```

Now when you enter your website into the sign in page of .io, it'll ask you to sign in using one of those platforms - noice.

Now you need to add some tags to your `<head>` so .io knows you want to use it:

```html
<!-- HTML -->

<link
  rel="webmention"
  href="https://webmention.io/www.your-website.com/webmention"
/>
<link rel="pingback" href="https://webmention.io/www.your-website.com/xmlrpc" />
```

Once you've done that, that's it! You're ready to accept webmentions! Any pages trying to send a webmention will see those tags, and know where to send requests.

### Rendering webmentions

So this will be different depending on how your website works, but as I'm a crazy person who wrote their own (admittedly very noddy) Static Site Generator, I had to do all this manually (code shamelessly stolen from Luke's article).

So, when I'm generating my articles, I first get all the webmentions for my site using the below script:

```typescript
// TypeScript

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
```

Ensure you define `WEBMENTION_BASE_URL`, `DOMAIN` and your `WEBMENTION_IO_TOKEN`, and you when this runs you'll now have all webmentions for your entire website!

So the next step is to filter out the webmentions you care about for each page. The following script takes all the webmentions, and filters out the ones that aren't any of the types we care about (more on that in a moment), and only for the page we care about:

```typescript
// TypeScript

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
        new Date(b.published).getTime() - new Date(a.published).getTime()
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
```

You'll note that we're only caring about the `like-of`, `repost-of`, `mention-of`, and `in-reply-to` types (with those last two types lumped together as `comments`).

So for each article page I'm generating, I pass in all the webmentions and the page path, and get back an object with the `likes`, `reposts`, and `comments` keys.

Now this is where my janky SSG really makes things look complicated, but essentially my HTML files have some handlebars-esque markers where content should go and be repeated - so I take that, and replace the values with each type of mention. For example:

```html
<!-- HTML -->

<!-- START_MENTIONS -->
<main class="thoughts mentions">
  <!-- START_LIKES -->
  <div class="likes">
    <h4>{LIKES} likes</h4>
    <div class="mention-links">
      <!-- START_LIKES_REP -->
      <a
        class="item"
        href="{mention_link}"
        target="_blank"
        rel="external noopener noreferrer"
      >
        <img
          src="{mention_avatar}"
          loading="lazy"
          decoding="async"
          width="28"
          height="28"
        /><span>{mention_name}</span></a
      >
      <!-- END_LIKES_REP -->
    </div>
  </div>
  <!-- END_LIKES -->

  <!-- START_REPOSTS -->
  <div class="reposts">
    <h4>{REPOSTS} reposts</h4>
    <div class="mention-links">
      <!-- START_REPOSTS_REP -->
      <a
        class="item"
        href="{mention_link}"
        target="_blank"
        rel="external noopener noreferrer"
      >
        <img
          src="{mention_avatar}"
          loading="lazy"
          decoding="async"
          width="28"
          height="28"
        /><span>{mention_name}</span></a
      >
      <!-- END_REPOSTS_REP -->
    </div>
  </div>
  <!-- END_REPOSTS -->

  <!-- START_COMMENTS -->
  <div class="comments">
    <h4>{COMMENTS} comments</h4>
    <div class="mention-links">
      <!-- START_COMMENTS_REP -->
      <div class="comment">
        <a
          class="item"
          href="{mention_link}"
          target="_blank"
          rel="external noopener noreferrer"
        >
          <img
            src="{mention_avatar}"
            loading="lazy"
            decoding="async"
            width="28"
            height="28"
          /><span>{mention_name}</span></a
        >
        <p>{comment}</p>
        <a
          class="item comment-link"
          href="{comment_link}"
          target="_blank"
          rel="external noopener noreferrer"
          ><span>View</span></a
        >
      </div>
      <!-- END_COMMENTS_REP -->
    </div>
  </div>
  <!-- END_COMMENTS -->
</main>
<!-- END_MENTIONS -->
```

Those `<!-- START_X -->` and `<!-- END_X -->` blocks are for my SSG script to see which bits should be repeated. The script that then replaces them looks something like (omitting the SSG janky bits):

```typescript
// TypeScript

const generateWebmentionBlock = (
  tag: 'COMMENTS' | 'LIKES' | 'REPOSTS',
  content: string,
  mentions: any[]
): string => {
  const isComment = tag === 'COMMENTS';

  // I'm omitting the whole bit around grabbing the repeating blocks from the content,
  // but that happens here if I were to subject you to my horrible hacky "Oh that'll
  // do" coding for personal stuff. You can always see the source code for this site
  // on my GitHub if you really want to see how bad it is...!

  return mentions
    .map((mention) => {
      return content
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
        .replace(/{comment_link}/g, isComment ? mention.url : '');
    })
    .join('');
};
```

And that's it! Do that for every page, and every type of mention, and you've now got webmentions into your site!

### Wait, that just does it at build time - won't webmentions come in over time?

Why yes voice in my head, you're correct! This will only grab the state of webmentions whenever the build runs.

To remedy this, I've set my build job on CircleCi to run every hour to grab new mentions and the site it generates and deploys will then have any new mentions. There are ways to configure webmention.io to poke a URL when you receive a mention, but I didn't want that to trigger masses of builds if I were to go #viral - so every hour it is!

```yaml
# Yaml

workflows:
  version: 2
  hourly:
    triggers:
      - schedule:
          cron: '55 * * * *' # 5 mins to every hour it will run
          filters:
            branches:
              only:
                - master
```

### Sending webmentions

Ok so we're now accepting webmentions ourselves, and rendering those on our pages. But how do we partake in the community happiness and send webmentions ourselves? Well now we get to play with webmention.app, and you'll see it's as simple as doing a `POST` request to `https://webmention.app/check/?url=:url` whenever we publish a new article.

You can also hook it up to various things, all walked through on the excellent homepage (RSS feeds are particularly useful!) which I won't repeat here for the sake of your sanity.

### Ok, but what about Twitter integration?

That's actually the simplest bit! Using [Bridgy](https://brid.gy/) you can connect your Twitter account, and it will monitor your profile for any likes/retweets/replies for links that are webmention-able, and automatically do all the scraping and sending for you!

## Hey presto!

I love it when the web decides "hey, wouldn't it be cool if...?" and a bunch of smart people get together and make it happen. Even better when some of those smart people create free apps like webmention.io, webmention.app, and brid.gy to make it super simple for everyone else to get started!

Big thanks to Luke's [excellent article](https://lukeb.co.uk/blog/2021/03/15/no-comment-adding-webmentions-to-my-site/#webmentions) for being so easy to follow; I'm simply typing it up again for the sake of writing an article myself, and spreading the webmention love.

Go make awesome things, and who knows, maybe this article will even get some interactions!
