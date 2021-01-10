import * as fs from 'fs';
import showdown from 'showdown';

import findInDir from './findInDir';

const generateChangelog = (): void => {
  // console.log('/// Beginning changelog generation');

  const CHANGELOG_HTML_LOCATION = './public/changelog.html';

  const changelogMdContent = fs.readFileSync('./CHANGELOG.md', 'utf8');
  let changelogHtmlContent = fs.readFileSync(CHANGELOG_HTML_LOCATION, 'utf8');

  const mdConverter = new showdown.Converter();

  const changelogContent = mdConverter.makeHtml(changelogMdContent);
  changelogHtmlContent = changelogHtmlContent.replace(
    '{changelog}',
    changelogContent
  );

  fs.writeFileSync(CHANGELOG_HTML_LOCATION, changelogHtmlContent, 'utf8');

  const versionMatch = changelogMdContent.match(
    /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?/
  );

  const version = versionMatch ? versionMatch[0] : 'ER.RO.R';

  // console.log(`Found version v${version}`);

  const pages = findInDir('./public', '.html');

  pages.forEach((page) => {
    const pageContent = fs.readFileSync(page, 'utf8');
    fs.writeFileSync(page, pageContent.replace('{version}', version), 'utf8');
  });

  // console.log(`Updated ${pages.length} with correct version changelog link`);

  // console.log('/// Finished changelog generation');
};

export default generateChangelog;
