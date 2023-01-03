Ever thought "ewww this site is so bright?!" and then searched for the "dark mode" button? I'm one of those people too, and despite my love of bright blocks of colour I decided that implementing a dark mode switch would be a good idea.

Additionally, I hate it when things _default_ to light mode, even though my machine is set to dark mode! So in this little guide, I'll walk you through how I implemented a machine-aware dark mode for this site.

## What's the plan?

As this site is very simple and static (no server-side rendering here, just good ol' fashioned HTML and CSS), I'll need to implement a client-side-only dark mode. This means I'll need to:

 - Figure out how I want to "apply" a dark mode across the site using CSS
 - Figure out the JavaScript to enable this dark mode

## How to apply dark mode in HTML

This one's quite simple, and I didn't want to muck around too much. As my site is powered by basic CSS (no CSS-in-JS or anything of that ilk), I can just apply a class to the `<body>` element, and then select on that!

So if it's in light mode, the body will just be:

```html
<body>
  <h1>Content</h1>
</body>
```

But in dark mode, it'll be:

```html
<body class="dark">
  <h1>Content</h1>
</body>
```

That means in CSS I can then do things like:

```css
// light mode is default
body {
  background: white;
}

h1 {
  color: black;
}

// dark mode has a more specific selector, so will override the light mode
body.dark {
  background: black;
}

.dark h1 {
  color: white;
}
```

## How to define the dark CSS styles

My site has a single `styles.css` that defines the site's theme, along with a `reset.css` for resetting browser defaults to 0 values and `syntax_highlight.css` for my syntax block styling. All these live in a `styles` folder, and my build process merges them all together and minifies them.

So, my plan is to copy/paste my `styles.css` to `styles_dark.css`, and remove any properties that aren't about colours. It was a slightly tedious process, but only took me 15 minutes to isolate all the colour values in my CSS. Now during development (before I've created the JavaScript), I manually added the `dark` class to my body element, and ran the site in development mode.

Now I've got a file with just the colours, I prepend the `.dark` class selector to the beginning of each of them. Because it's a standard CSS file, I select all instances of `{` using VS Code `CTRL/CMD + D`, then hit the `Home` key to take me to the beginning of each line, and smack in `.dark` - now all my `styles_dark.css` selectors are prefixed with the correct selector - neat!

With my site running in development mode and the body being hard-coded to be `class="dark"`, I just modified all the values until I was happy with the darker theme.

If this sounds like a lot of manual steps, it is! But only because my site is very, _very_ simplistic in its implementation for maximum speed/ease of maintenance.

## How to flip between light and dark mode

### Simple functionality

Now I've decided on adding the `dark` class to my `<body>` tag, I can write some JavaScript to control this functionality. To begin with, I just added a button to the top of my home page (who cares about styling right now), and some simple JavaScript:

```html
<!-- HTML -->

<!-- At the top of my home page -->
<button onclick="switchMode()">Switch dark/light mode</button>

<!-- Just before the closing body tag -->
<script>
  var darkMode = false;
  function switchMode() {
    if (darkMode) {
      darkMode = false;
      document.body.classList.remove('dark');
    } else {
      darkMode = true;
      document.body.classList.add('dark');
    }
  }
</script>
```

Hooray! Now the site switches between light and dark mode as expected.

### Remembering preference

Now we're switching between modes, but it doesn't remember my last mode on page refresh! Let's use local storage to remember our value:

```javascript
// retrieve from local storage
var darkMode = window.localStorage.getItem('darkMode') || 'false';
if (darkMode === 'true') {
  document.body.classList.add('dark');
}

// enable switching functionality
function switchMode() {
  if (darkMode === 'true') {
    darkMode = 'false';
    document.body.classList.remove('dark');
  } else {
    darkMode = 'true';
    document.body.classList.add('dark');
  }
  window.localStorage.setItem('darkMode', darkMode);
}
```

Note that we have to use string versions of `true` and `false`, because local storage _always_ stores things as strings. Now our site remembers our preference, defaulting to light mode.

### Honouring system preference

This is great, but if the site is being viewed on a browser/machine with dark mode enabled system-wide, we should honour that too by default:

```javascript
// detect browser setup
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && !window.localStorage.getItem('darkMode')) {
  window.localStorage.setItem('darkMode', 'true');
}

// retrieve from local storage
var darkMode = window.localStorage.getItem('darkMode') || 'false';
if (darkMode === 'true') {
  document.body.classList.add('dark');
}

// enable switching functionality
function switchMode() {
  if (darkMode === 'true') {
    darkMode = 'false';
    document.body.classList.remove('dark');
  } else {
    darkMode = 'true';
    document.body.classList.add('dark');
  }
  window.localStorage.setItem('darkMode', darkMode);
}
```

There are some caveats to this method (it's supported only in modern browsers), but it's good enough to cover 95% of users of the web, and I would suspect almost 100% of viewers of my site (due to the target audience). Again, it will default to light mode if it can't use `window.matchMedia`, so no harm no foul.

## Pretty SVG button

Finally, I updated the styling of my boring-standard button to be something snazzier, using a nice SVG of a filled or hollow sun:

```html
<section class="darkmode">
  <button onclick="switchMode()">
    <svg class="lightSun" xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 48 48">
      <g id="Layer_2" data-name="Layer 2">
        <g id="invisible_box" data-name="invisible box">
          <rect width="48" height="48" fill="none" />
        </g>
        <g id="Q3_icons" data-name="Q3 icons">
          <g>
            <path d="M24,10a2,2,0,0,0,2-2V4a2,2,0,0,0-4,0V8A2,2,0,0,0,24,10Z" />
            <path d="M24,38a2,2,0,0,0-2,2v4a2,2,0,0,0,4,0V40A2,2,0,0,0,24,38Z" />
            <path d="M36.7,14.1l2.9-2.8a2.3,2.3,0,0,0,0-2.9,2.3,2.3,0,0,0-2.9,0l-2.8,2.9a2,2,0,1,0,2.8,2.8Z" />
            <path d="M11.3,33.9,8.4,36.7a2.3,2.3,0,0,0,0,2.9,2.3,2.3,0,0,0,2.9,0l2.8-2.9a2,2,0,1,0-2.8-2.8Z" />
            <path d="M44,22H40a2,2,0,0,0,0,4h4a2,2,0,0,0,0-4Z" />
            <path d="M10,24a2,2,0,0,0-2-2H4a2,2,0,0,0,0,4H8A2,2,0,0,0,10,24Z" />
            <path d="M36.7,33.9a2,2,0,1,0-2.8,2.8l2.8,2.9a2.1,2.1,0,1,0,2.9-2.9Z" />
            <path d="M11.3,14.1a2,2,0,0,0,2.8-2.8L11.3,8.4a2.3,2.3,0,0,0-2.9,0,2.3,2.3,0,0,0,0,2.9Z" />
            <path d="M24,14A10,10,0,1,0,34,24,10,10,0,0,0,24,14Zm0,16a6,6,0,1,1,6-6A6,6,0,0,1,24,30Z" />
          </g>
        </g>
      </g>
    </svg>
    <svg class="darkSun" xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 48 48">
      <g id="Layer_2" data-name="Layer 2">
        <g id="invisible_box" data-name="invisible box">
          <rect width="48" height="48" fill="none" />
        </g>
        <g id="Q3_icons" data-name="Q3 icons">
          <g>
            <path d="M24,10a2,2,0,0,0,2-2V4a2,2,0,0,0-4,0V8A2,2,0,0,0,24,10Z" />
            <path d="M24,38a2,2,0,0,0-2,2v4a2,2,0,0,0,4,0V40A2,2,0,0,0,24,38Z" />
            <path d="M36.7,14.1l2.9-2.8a2.3,2.3,0,0,0,0-2.9,2.3,2.3,0,0,0-2.9,0l-2.8,2.9a2,2,0,1,0,2.8,2.8Z" />
            <path d="M11.3,33.9,8.4,36.7a2.3,2.3,0,0,0,0,2.9,2.3,2.3,0,0,0,2.9,0l2.8-2.9a2,2,0,1,0-2.8-2.8Z" />
            <path d="M44,22H40a2,2,0,0,0,0,4h4a2,2,0,0,0,0-4Z" />
            <path d="M10,24a2,2,0,0,0-2-2H4a2,2,0,0,0,0,4H8A2,2,0,0,0,10,24Z" />
            <path d="M36.7,33.9a2,2,0,1,0-2.8,2.8l2.8,2.9a2.1,2.1,0,1,0,2.9-2.9Z" />
            <path d="M11.3,14.1a2,2,0,0,0,2.8-2.8L11.3,8.4a2.3,2.3,0,0,0-2.9,0,2.3,2.3,0,0,0,0,2.9Z" />
            <path d="M24,14A10,10,0,1,0,34,24,10,10,0,0,0,24,14Z" />
          </g>
        </g>
      </g>
    </svg>
  </button>
</section>
```

And I use CSS to show or hide the appropriate SVG:

```css
// default to showing darkSun (ie, light mode)
.lightSun {
  display: none;
}

// show lightSun and hide darkSun in dark mode
.dark .lightSun {
  display: block;
  fill: #fff;
}
.dark .darkSun {
  display: none;
}
```

Now I just add this code to all my pages, popping the JavaScript in my `footer.html` partial, and the SVG button to my `header.html` partial - now it's on every page!

## This isn't perfect

This is by no means a perfect implementation - the biggest issue is that there's a "flash of unstyled content" when the page loads and it runs the JavaScript to detect if you have dark mode on, and _then_ applies the `dark` class to the `<body>` element. However, for this _incredibly basic site_ it happens in ~2ms, so I think it's a trade-off worth making for the utter simplicity of the implementation.

Go click that sun in the top-right hand corner of the site and let me know what you think!
