/* Run with a locally available Playwright installation:
   node frontend/tests/smoke.cjs
   PLAYWRIGHT_MODULE may point to an existing playwright-core installation.
   All schedule requests are mocked; this does not verify the live CDN.
*/
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(os.tmpdir(), 'friday-frontend-qa');
fs.mkdirSync(output, { recursive: true });

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const files = { '/': 'index.html', '/index.html': 'index.html', '/assets/black.png': 'assets/black.png', '/assets/White.png': 'assets/White.png' };
  if (!files[pathname]) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', pathname.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
  fs.createReadStream(path.join(root, files[pathname])).pipe(response);
});
const fixture = { courses: [
  { courseCode: 'CSE200', courseName: 'Algorithms', sectionName: '2', faculties: 'ABC', capacity: 30, consumedSeat: 12, roomName: 'UB201', sectionType: 'Theory', sectionSchedule: { classSchedules: [{ day: 'Sunday', startTime: '10:00:00', endTime: '11:20:00' }], midExamDate: '2026-11-20', midExamStartTime: '10:00:00', midExamEndTime: '12:00:00', finalExamDate: '2026-12-20' } },
  { courseCode: 'CSE100', courseName: '<img src=x onerror="window.injected=true">', sectionName: '1', faculties: 'XYZ', labFaculties: 'LAB', capacity: 25, consumedSeat: 5, sectionSchedule: { classSchedules: [{ day: 'Tuesday', startTime: '08:00:00', endTime: '09:20:00' }] }, labSchedules: [{ day: 'Monday', startTime: '12:00:00', endTime: '13:00:00' }] },
  null, { invalid: true }
] };

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  let failures = 0;
  let passed = 0;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
    await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '' }));
    await context.route('https://fonts.gstatic.com/**', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let feed = 'ok';
    await page.route('**/connect-migrate.json?*', async route => {
      if (feed === 'fail') return route.fulfill({ status: 503, body: 'Unavailable' });
      if (feed === 'bad') return route.fulfill({ json: { wrong: [] } });
      return route.fulfill({ json: feed === 'empty' ? { courses: [] } : fixture });
    });
    const test = async (name, run) => {
      try { await run(); passed++; console.log(`PASS ${name}`); }
      catch (error) { failures++; console.error(`FAIL ${name}: ${error.stack}`); }
    };
    const open = async name => {
      await page.evaluate(name => openView(name), name);
      await page.waitForFunction(name => document.title.includes(name), name === 'landing' ? 'Student OS' : await page.evaluate(name => views[name].title, name));
    };
    const settleSchedule = () => page.waitForFunction(() => document.getElementById('schedulePanel').getAttribute('aria-busy') === 'false');

    await page.goto(origin);
    await test('Every route shows one page, isolates landing, and closes with focus restored', async () => {
      const routes = await page.evaluate(() => Object.keys(views).filter(name => name !== 'landing'));
      for (const name of routes) {
        await page.locator('[aria-label="Personal profile"]').focus();
        await open(name);
        assert.equal(await page.locator('.page-panel:visible, .schedule-panel:visible, .deadline-panel:visible').count(), 1, name);
        assert.equal(await page.locator('#portalMain').evaluate(main => main.inert && main.hidden), true, name);
        assert.equal(await page.locator('.topbar').isVisible(), true, name);
        assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H2', name);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#portalMain').isVisible(), true, name);
        assert.equal(await page.locator('[aria-label="Personal profile"]').evaluate(control => control === document.activeElement), true);
      }
    });
    await test('Every original navigation, quick chip, CTA and footer control is wired', async () => {
      const navigationSelector = '.nav-button:not([aria-controls]), .sub-button, .quick-chip, .hero-actions a, .bottom-links button, .sub-meta button';
      const selectors = await page.locator(navigationSelector).evaluateAll(controls => controls.map((control, index) => ({ label: control.textContent.trim(), route: control.dataset.view, index })));
      assert.equal(selectors.filter(control => !control.route).length, 0, JSON.stringify(selectors));
      for (const control of selectors) {
        await open('landing');
        if (['Class', 'Exam'].includes(control.label)) {
          await page.locator('.nav-button[aria-controls]').click();
          if (!(await page.locator('#scheduleChoices').isVisible())) await page.locator('.nav-button[aria-controls]').click();
        }
        const target = page.locator(navigationSelector).nth(control.index);
        await target.click();
        assert.equal(await page.evaluate(() => activeView), control.route, control.label);
      }
    });
    await test('Direct links, browser history and view-to-view transitions', async () => {
      await page.goto(origin + '/#deadlines');
      assert.equal(await page.locator('#deadlinePanel').isVisible(), true);
      await open('class'); await settleSchedule(); await open('login');
      await page.goBack(); await settleSchedule();
      assert.equal(await page.locator('#schedulePanel').isVisible(), true);
      await page.goBack();
      assert.equal(await page.locator('#deadlinePanel').isVisible(), true);
      await page.goForward(); await settleSchedule();
      assert.equal(await page.locator('#schedulePanel').isVisible(), true);
      await page.goto(origin + '/#unknown');
      assert.equal(await page.locator('#portalMain').isVisible(), true);
    });
    await test('Login validation, recovery explanation and demo return without credential storage', async () => {
      await open('landing'); await page.locator('[aria-label="Personal profile"]').click();
      await page.locator('#loginForm button[type="submit"]').click();
      assert.equal(await page.locator('#loginEmail').getAttribute('aria-invalid'), 'true');
      await page.locator('#loginEmail').fill('invalid');
      await page.locator('#loginForm button[type="submit"]').click();
      assert.equal(await page.locator('#loginEmail').getAttribute('aria-invalid'), 'true');
      await page.getByRole('button', { name: 'Forgot password?' }).click();
      assert.match(await page.locator('#loginMessage').textContent(), /No email has been sent/);
      await page.locator('#loginEmail').fill('demo@example.edu'); await page.locator('#loginPassword').fill('example-only');
      await page.locator('#loginForm button[type="submit"]').click();
      await page.waitForFunction(() => document.getElementById('portalMain').hidden === false);
      assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
      await open('login'); assert.equal(await page.locator('#loginPassword').inputValue(), '');
    });
    await test('Notice search, categories, read state and empty-filter reset', async () => {
      await open('notices');
      assert.equal(await page.locator('#noticeResults article').count(), 3);
      await page.locator('[data-action="notice-category"][data-category="Academic"]').click();
      assert.equal(await page.locator('#noticeResults article').count(), 1);
      await page.locator('#noticeSearch').fill('no-such-notice');
      assert.match(await page.locator('#noticeResults').textContent(), /No notices match/);
      await page.getByRole('button', { name: 'Reset filters' }).click();
      await page.locator('#noticeUnread').check();
      assert.equal(await page.locator('#noticeResults article').count(), 2);
      await page.locator('[data-action="notice-read"]').first().click();
      assert.equal(await page.locator('#noticeResults article').count(), 1);
    });
    await test('Attendance records, empty state, error and retry', async () => {
      await open('attendance');
      assert.match(await page.locator('#attendanceRecords').textContent(), /Below threshold/);
      await page.locator('#attendanceScenario').selectOption('empty');
      assert.match(await page.locator('#attendanceRecords').textContent(), /No courses yet/);
      await page.locator('#attendanceScenario').selectOption('error');
      await page.getByRole('button', { name: 'Retry demo records' }).click();
      assert.equal(await page.locator('#attendanceRecords .course-row').count(), 3);
    });
    await test('Degree credit totals and prerequisite context', async () => {
      await open('degree');
      assert.match(await page.locator('#featureContent').textContent(), /54 of 124/);
      assert.equal(await page.getByRole('progressbar', { name: 'Degree credits completed' }).getAttribute('aria-valuenow'), '54');
      assert.match(await page.locator('#featureContent').textContent(), /CSE221 is blocked/);
      await page.getByRole('link', { name: 'Preview account setup' }).click();
      assert.equal(await page.locator('#loginForm').isVisible(), true);
    });
    await test('Planner term selection, empty term, adding and removing courses', async () => {
      await open('planner');
      assert.equal(await page.locator('#plannerSummary .course-row').count(), 3);
      await page.locator('#plannerTerm').selectOption('Spring 2027');
      assert.match(await page.locator('#plannerSummary').textContent(), /A fresh semester/);
      await page.locator('#plannerAdd button').click();
      assert.equal(await page.locator('#plannerSummary .course-row').count(), 1);
      await page.locator('[data-action="planner-remove"]').click();
      assert.match(await page.locator('#plannerSummary').textContent(), /A fresh semester/);
    });
    await test('Registration loading, conflict example and unavailable semester', async () => {
      await open('registration');
      await page.locator('#registrationForm button').click();
      assert.equal(await page.locator('#registrationForm button').isDisabled(), true);
      await page.waitForFunction(() => document.getElementById('registrationResult').getAttribute('aria-busy') === 'false');
      assert.match(await page.locator('#registrationResult').textContent(), /Example conflict/);
      await page.locator('#registrationTerm').selectOption('Spring 2027');
      await page.locator('#registrationForm button').click();
      await page.waitForFunction(() => document.getElementById('registrationResult').getAttribute('aria-busy') === 'false');
      assert.match(await page.locator('#registrationResult').textContent(), /No example sections/);
    });
    await test('Personal deadlines validate, escape markup, complete, remove and reset on reload', async () => {
      await open('deadlines');
      await page.getByRole('button', { name: 'Add personal deadline' }).click();
      await page.locator('#deadlineForm button[type="submit"]').click();
      assert.match(await page.locator('#deadlineError').textContent(), /Enter a title/);
      await page.locator('#deadlineName').fill('<img src=x onerror="window.injected=true">');
      await page.locator('#deadlineDate').fill('2020-01-01');
      await page.locator('#deadlineForm button[type="submit"]').click();
      assert.match(await page.locator('#deadlineError').textContent(), /today or a future/);
      const today = await page.evaluate(() => localToday());
      await page.locator('#deadlineDate').fill(today);
      await page.locator('#deadlineForm button[type="submit"]').click();
      assert.equal(await page.locator('#deadlineResults img').count(), 0);
      assert.equal(await page.locator('#deadlineResults .deadline-card').count(), 4);
      await page.locator('[data-action="deadline-done"][data-id="personal-1"]').click();
      await page.locator('#deadlineFilter').selectOption('done');
      assert.equal(await page.locator('#deadlineResults .deadline-card').count(), 1);
      await page.locator('[data-action="deadline-remove"][data-id="personal-1"]').click();
      assert.match(await page.locator('#deadlineResults').textContent(), /No deadlines here/);
      await page.reload();
      assert.equal(await page.locator('#deadlineResults .deadline-card').count(), 3);
    });
    await test('Schedule sorting, filters, exam records and escaping untrusted fields', async () => {
      feed = 'ok'; await open('class'); await settleSchedule();
      assert.equal(await page.locator('#scheduleBody tr').count(), 2);
      assert.match(await page.locator('#scheduleBody tr').first().textContent(), /CSE100/);
      assert.equal(await page.locator('#scheduleBody img').count(), 0);
      assert.equal(await page.evaluate(() => Boolean(window.injected)), false);
      await page.locator('#facultySearch').fill('ABC');
      assert.equal(await page.locator('#scheduleBody tr').count(), 1);
      await page.locator('#facultySearch').fill('LAB');
      assert.match(await page.locator('#scheduleBody').textContent(), /CSE100/);
      await page.locator('#facultySearch').fill('');
      await page.locator('#scheduleSearch').fill('nonexistent');
      assert.match(await page.locator('#scheduleBody').textContent(), /No matching/);
      await page.locator('#scheduleSearch').fill('');
      await open('exam'); await settleSchedule();
      assert.equal(await page.locator('#scheduleHead th').count(), 4);
      assert.match(await page.locator('#scheduleBody').textContent(), /Midterm/);
      await page.locator('#scheduleSearch').fill('nonexistent');
      assert.equal(await page.locator('#scheduleBody td').getAttribute('colspan'), '4');
      await page.locator('#scheduleSearch').fill('');
    });
    await test('Schedule failure, malformed source, retry, empty feed and rapid navigation', async () => {
      feed = 'fail'; await page.goto(origin); await open('class'); await settleSchedule();
      assert.match(await page.locator('#scheduleStatus').textContent(), /could not be loaded/);
      feed = 'bad'; await page.getByRole('button', { name: 'Refresh data' }).click(); await settleSchedule();
      assert.match(await page.locator('#scheduleStatus').textContent(), /could not be loaded/);
      feed = 'ok'; await page.getByRole('button', { name: 'Refresh data' }).click(); await settleSchedule();
      assert.equal(await page.locator('#scheduleBody tr').count(), 2);
      feed = 'fail'; await page.getByRole('button', { name: 'Refresh data' }).click(); await settleSchedule();
      assert.match(await page.locator('#scheduleStatus').textContent(), /previously fetched/);
      feed = 'empty'; await page.getByRole('button', { name: 'Refresh data' }).click(); await settleSchedule();
      assert.match(await page.locator('#scheduleStatus').textContent(), /0 class sections/);
      feed = 'ok'; await open('class'); await open('exam'); await open('notices');
      assert.equal(await page.locator('.page-panel:visible, .schedule-panel:visible, .deadline-panel:visible').count(), 1);
    });
    await test('Assistant links cite the demo source', async () => {
      await open('assistant');
      await page.getByRole('button', { name: 'Check my deadlines' }).click();
      assert.match(await page.locator('#assistantAnswer').textContent(), /Source: FRIDAY prototype deadlines/);
      await page.getByRole('link', { name: 'Open demo deadlines' }).click();
      assert.equal(await page.locator('#deadlinePanel').isVisible(), true);
    });
    await test('Sidebar collapse persists, hover expands temporarily and keyboard focus reveals labels', async () => {
      await open('landing');
      await page.locator('#sidebarToggle').click();
      await page.mouse.move(1100, 500); await page.waitForTimeout(300);
      assert.equal(Math.round((await page.locator('#portalSidebar').boundingBox()).width), 52);
      await page.locator('#portalSidebar').hover(); await page.waitForTimeout(300);
      assert.equal(Math.round((await page.locator('#portalSidebar').boundingBox()).width), 210);
      await page.mouse.move(1100, 500); await page.waitForTimeout(300);
      assert.equal(Math.round((await page.locator('#portalSidebar').boundingBox()).width), 52);
      await page.locator('.nav-button[data-view="notices"]').focus(); await page.waitForTimeout(300);
      assert.equal(Math.round((await page.locator('#portalSidebar').boundingBox()).width), 210);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#featureTitle').textContent(), 'Notice board');
      assert.equal(await page.locator('#portalSidebar').evaluate(sidebar => sidebar.classList.contains('collapsed')), true);
      await page.locator('#sidebarToggle').click();
    });
    await test('Keyboard skip link and hidden views stay outside the tab sequence', async () => {
      await open('landing');
      await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#portalMain').evaluate(main => main === document.activeElement), true);
      await open('notices');
      await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#featureTitle').evaluate(title => title === document.activeElement), true);
      for (let index = 0; index < 24; index++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[hidden], [inert]'))), false);
      }
    });
    await test('Themes, fixed watermark, 360px layout and reduced motion across every route', async () => {
      const routes = await page.evaluate(() => Object.keys(views));
      for (const width of [1440, 360]) {
        await page.setViewportSize({ width, height: width === 360 ? 800 : 1000 });
        for (const theme of ['dark', 'light']) {
          await page.evaluate(theme => applyTheme(theme), theme);
          let watermark;
          for (const name of routes) {
            await open(name);
            if (['class', 'exam'].includes(name)) await settleSchedule();
            const measure = await page.evaluate(() => {
              const panel = [...document.querySelectorAll('.page-panel, .schedule-panel, .deadline-panel')].find(panel => !panel.hidden);
              const style = getComputedStyle(document.querySelector('.portal-shell'), '::before');
              return { bodyOverflow: document.documentElement.scrollWidth > innerWidth, panelOverflow: panel ? panel.scrollWidth > panel.clientWidth : false, watermark: [style.position, style.transform, style.inset, style.fontSize].join('|') };
            });
            assert.equal(measure.bodyOverflow, false, `${name} ${width} ${theme}: body overflow`);
            assert.equal(measure.panelOverflow, false, `${name} ${width} ${theme}: panel overflow`);
            if (watermark) assert.equal(measure.watermark, watermark, `${name}: watermark moved`);
            watermark = measure.watermark;
          }
          await open('notices');
          await page.waitForTimeout(250);
          await page.screenshot({ path: path.join(output, `notices-${width}-${theme}.png`), fullPage: true });
          if (theme === 'dark') {
            for (const name of ['landing', 'login', 'degree']) {
              await open(name); await page.waitForTimeout(250);
              await page.screenshot({ path: path.join(output, `${name}-${width}-${theme}.png`), fullPage: true });
            }
          }
        }
      }
      await page.emulateMedia({ reducedMotion: 'reduce' }); await open('degree');
      assert.equal(await page.locator('#featurePanel').evaluate(panel => getComputedStyle(panel).animationName), 'none');
      await page.setViewportSize({ width: 720, height: 500 });
      await open('landing');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(errors.length, 0, errors.join('\n'));
    });
    console.log(`\n${passed} passed; ${failures} failed. Screenshots: ${output}`);
    process.exitCode = failures ? 1 : 0;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
