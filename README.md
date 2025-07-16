# ripixel.co.uk

> “Why use a static site generator when you can just... y'know... write the HTML yourself?”
>
> *— Past Me, before [Skier](https://github.com/ripixel/skier)*

---

## Wait, what changed?

Once upon a time, this repo was a shrine to DIY static site generation: hand-rolled scripts, copy-pasted partials, and a stubborn refusal to use “real” tools.
But then Skier came along—minimal, modular, and just as allergic to bloat as I am. Now, all the build magic happens in [Skier](https://github.com/ripixel/skier), and this repo is just the content, templates, and a sprinkle of config.

---

## How does it work now?

- **Build pipeline?**
  All the heavy lifting is handled by Skier’s built-in tasks: pages, blog, feeds, static assets, CSS, you name it.
  The pipeline is defined in [`skier.tasks.cjs`](./skier.tasks.cjs)—open it up and you’ll see exactly what happens, in what order, and why.
- **Templates & partials?**
  Still Handlebars, still easy.
  All the HTML lives in `/pages` and `/partials`, just like before (but now with more sanity).
- **Content?**
  Markdown and HTML. That's it.
  Blog posts and other items are in `/items`
- **Assets?**
  Static files go in `/assets` and get copied over.
  CSS is bundled and minified for you.
  No more “did I forget to copy favicon.ico?” moments.

---

## Building & Deploying

- **Build:**
  `npm run build` (calls Skier, not a homegrown script)
- **Preview locally:**
  Use your favorite static server, e.g. `npx serve public`
- **Deploy:**
  Hosted on Firebase. Run `firebase deploy` (CI uses `firebase deploy --token $FIREBASE_TOKEN`).

---

## Why Skier?

Because life’s too short to debug your own static site generator.
Skier is minimal, type-safe, and doesn’t try to outsmart you.
Want to see how it works? Check out [Skier on GitHub](https://github.com/ripixel/skier).

---

## License

MIT
