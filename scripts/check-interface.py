"""Guard the portfolio's palette, semantics, and local asset references."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re

ROOT = Path(__file__).resolve().parents[1]
errors = []

class PageCheck(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.headings = 0
        self.has_main = False
        self.has_skip = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.headings += tag == 'h1'
        self.has_main |= tag == 'main'
        self.has_skip |= attrs.get('class') == 'skip-link'
        if tag == 'img':
            for key in ('alt', 'width', 'height'):
                if key not in attrs:
                    errors.append(f'{self.path.relative_to(ROOT)}: image missing {key}: {attrs.get("src")}')
        for key in ('src', 'href', 'poster'):
            raw = attrs.get(key, '')
            url = urlsplit(raw)
            if not raw or raw.startswith('#') or url.scheme or url.netloc:
                continue
            path = unquote(url.path)
            target = ROOT / path.lstrip('/') if path.startswith('/') else self.path.parent / path
            if not target.exists() and not target.with_suffix('.html').is_file():
                errors.append(f'{self.path.relative_to(ROOT)}: missing asset: {raw}')

pages = [*ROOT.glob('*.html'), *ROOT.glob('work/*.html'), ROOT / 'one-breath-dive/index.html']
for path in pages:
    page = PageCheck(path)
    page.feed(path.read_text())
    if page.has_main:
        if page.headings != 1:
            errors.append(f'{path.name}: expected one primary heading, found {page.headings}')
        if not page.has_skip:
            errors.append(f'{path.name}: missing skip link')

class ProjectFooterCheck(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inside = False
        self.destinations = []
        self.all_work = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'nav' and attrs.get('aria-label') == 'More projects':
            self.inside = True
        if not self.inside or tag != 'a':
            return
        if attrs.get('class') == 'case-project-nav__all':
            self.all_work = attrs.get('href') == '../work'
        elif 'case-project-link' in attrs.get('class', '').split():
            self.destinations.append(attrs.get('href'))

    def handle_endtag(self, tag):
        if tag == 'nav':
            self.inside = False

sequence = ['voyage-monitor', 'internal-panel', 'team-lift-ai', 'housing-anywhere']
for index, slug in enumerate(sequence):
    footer = ProjectFooterCheck()
    footer.feed((ROOT / 'work' / f'{slug}.html').read_text())
    expected = ([sequence[index - 1]] if index else []) + ([sequence[index + 1]] if index < len(sequence) - 1 else [])
    if footer.destinations != expected or not footer.all_work:
        errors.append(f'{slug}: previous/next projects do not match the approved sequence')

tokens = (ROOT / 'design-tokens.css').read_text()
colors = re.findall(r'--color-([a-z]+):\s*(#[0-9a-f]+);', tokens)
if {name for name, _ in colors} != {'rose', 'green', 'orange', 'blue', 'grey', 'white', 'black'} or len(colors) != 7:
    errors.append('The interface must declare exactly seven base colors')
for path in [ROOT / 'styles.css', ROOT / 'letter-animation.css', ROOT / 'script.js', ROOT / 'homepage-intro.css', ROOT / 'homepage-intro.js', ROOT / 'homepage-intro-settings.js', ROOT / 'home-entrance.js', ROOT / 'one-breath-dive/polish.css', ROOT / 'one-breath-dive/theme.js', ROOT / 'one-breath-dive/assets/index-DQLiwshm.css']:
    if re.search(r'#[0-9a-fA-F]{3,8}\b|rgba?\(', path.read_text()) and path.name != 'theme.js':
        errors.append(f'{path.name}: independent color value outside design tokens')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'Interface checks passed: {len(pages)} HTML documents, seven base colors, local links, headings, and image dimensions.')
