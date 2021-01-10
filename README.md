# ripixel.co.uk

Why use a static site generator when you can just... y'know... write the HTML yourself?

## Why

SSGs are amazing, if you want a full-fledged site. But if you just want to dumb copy/paste one file into another, they're _so much overkill_.

## What

This repo simply looks for any `{template_name.html}` in the body of the `pages/page_name.html`, and replaces it with the content of `partials/template_name.html`, and writes it to `public/page_name.html` with that new content.

It also does a few other little things, like looking for `{page}` and replacing it with the `page_name` (for uses like `class="home"` and setting the `<title>`).

Nice and simple, who needs Gatsby.

## How

Using TypeScript and ts-node, this script lives in `./scripts/generatePages.ts`. Why TypeScript; because it's great, and it makes JavaScript fun again.

Run `npm run build` to execute this script, as well as copy over any assets required into the `public/` directory.

## Where

The site is hosted on Firebase, and can be deployed by using `firebase deploy`. The CI pipeline uses `firebase deploy --token tokenFromEnvVars`.
