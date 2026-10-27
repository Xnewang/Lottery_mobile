const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// Exercise the same Alpine component used by the Flask page.
const html = fs.readFileSync(path.join(__dirname, '../server/templates/index.html'), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(script, context);

function draw(period, zodiacs) {
    const seven = Array.from({ length: 7 }, (_, i) => zodiacs[i % zodiacs.length]);
    return {
        period: String(period), numbers: [1, 2, 3, 4, 5, 6], special: 7,
        normal_zodiacs: seven.slice(0, 6), zodiac: seven[6],
    };
}

function component(rows, selected) {
    const app = context.app();
    app.selectedYear = 2026;
    app.drawYears = [2026, 2025];
    app.yearDrawsCache = { [app.yearCacheKey(2026)]: rows };
    app.zodiacFilters = selected;
    // Each fixture represents a fresh history load, independent of the shared cache.
    app.analysisHistoryVersion = ++component.version;
    return app;
}
component.version = 0;

function keys(app) {
    return Array.from(app.getVisibleTripleRunPatterns(), item => item.key);
}

test('three selected zodiacs never fall back to a combination sharing only two', () => {
    const rows = [2026005, 2026004, 2026003].map(p => draw(p, ['鼠', '兔', '猴']));
    const app = component(rows, ['鼠', '兔', '猪']);
    assert.ok(app.getTripleRunPatterns().some(item => item.key === '鼠|兔|猴'));
    assert.deepEqual(keys(app), []);
    assert.match(app.getSelectedTripleRunSummary(), /没有连续3期/);
    assert.match(app.getTripleRunResultsSummary(), /仅统计.*鼠、兔、猪/);
});

test('default results require every selected zodiac in every draw', () => {
    const rows = [2026005, 2026004, 2026003].map(p => draw(p, ['鼠', '兔', '猪', '牛']));
    const app = component(rows, ['猪', '鼠', '兔']);
    assert.deepEqual(keys(app), ['鼠|兔|猪']);
    assert.equal(app.getSelectedTripleRuns()[0].length, 3);
    assert.equal(app.getVisibleTripleRunPatterns()[0].isSelected, true);
});

test('two and four zodiac selections also match the complete selected combination', () => {
    const rows = [2026005, 2026004, 2026003].map(p => draw(p, ['鼠', '牛', '兔', '猪', '猴']));
    for (const selection of [['鼠', '兔'], ['鼠', '牛', '兔', '猪']]) {
        const app = component(rows, selection);
        assert.deepEqual(keys(app), [app.getTripleKey(selection)]);
    }
});

test('other combinations are shown only on explicit switching and selection changes reset it', () => {
    const rows = [2026005, 2026004, 2026003].map(p => draw(p, ['鼠', '牛', '兔', '猪']));
    const app = component(rows, ['鼠', '兔', '猪']);
    const selectedKey = app.getTripleKey(app.zodiacFilters);
    app.tripleRunMode = 'others';
    assert.equal(keys(app).length, 3);
    assert.ok(!keys(app).includes(selectedKey));
    app.toggleZodiacFilter('猪');
    app.toggleZodiacFilter('牛');
    assert.equal(app.tripleRunMode, 'selected');
    assert.deepEqual(keys(app), ['鼠|牛|兔']);
});

test('same-width selection changes cannot leave cached results for the previous selection', () => {
    const rows = [2026005, 2026004, 2026003].map(p => draw(p, ['鼠', '兔', '猪']));
    const app = component(rows, ['鼠', '兔', '猪']);
    assert.equal(keys(app).length, 1);
    app.zodiacFilters = ['鼠', '兔', '猴'];
    assert.deepEqual(keys(app), []);
    app.zodiacFilters = ['猪', '兔', '鼠'];
    assert.deepEqual(keys(app), ['鼠|兔|猪']);
});

test('a missing selected zodiac or a period gap breaks the three-draw run', () => {
    for (const rows of [
        [draw(2026005, ['鼠', '兔', '猪']), draw(2026004, ['鼠', '兔', '猴']), draw(2026003, ['鼠', '兔', '猪'])],
        [2026005, 2026004, 2026002].map(p => draw(p, ['鼠', '兔', '猪'])),
    ]) {
        assert.deepEqual(keys(component(rows, ['鼠', '兔', '猪'])), []);
    }
});

test('the special ball counts toward the complete selection', () => {
    const rows = [2026005, 2026004, 2026003].map(p => ({
        ...draw(p, ['鼠', '兔']), zodiac: '猪',
    }));
    assert.deepEqual(keys(component(rows, ['鼠', '兔', '猪'])), ['鼠|兔|猪']);
});

test('year and all-history scopes both keep exact selected-combination matching', () => {
    const app = component([], ['鼠', '兔', '猪']);
    app.yearDrawsCache[app.yearCacheKey(2025)] = [2025005, 2025004, 2025003].map(p => draw(p, ['鼠', '兔', '猪', '猴']));
    assert.deepEqual(keys(app), []);
    app.analysisScope = 'all';
    assert.deepEqual(keys(app), ['鼠|兔|猪']);
    assert.equal(app.getSelectedTripleRuns()[0].year, 2025);
});

test('switching Macau data sources does not reuse the other source matching results', () => {
    const rows = [2026005, 2026004, 2026003].map(p => draw(p, ['鼠', '兔', '猪']));
    const app = component(rows, ['鼠', '兔', '猪']);
    app.yearDrawsCache[app.yearCacheKey(2026, 'oldMacau')] = rows.map(row => draw(row.period, ['鼠', '兔', '猴']));
    assert.deepEqual(keys(app), ['鼠|兔|猪']);
    app.drawSource = 'oldMacau';
    assert.deepEqual(keys(app), []);
    app.drawSource = 'newMacau';
    assert.deepEqual(keys(app), ['鼠|兔|猪']);
});

// New Macau records returned by the deployed API for the range in the user's screenshot.
const screenshotRows = [
    { period: '2026158', numbers: [43, 48, 3, 1, 12, 23], normal_zodiacs: ['鼠', '羊', '龙', '马', '羊', '猴'], special: 16, zodiac: '兔' },
    { period: '2026157', numbers: [43, 25, 11, 31, 17, 10], normal_zodiacs: ['鼠', '马', '猴', '鼠', '虎', '鸡'], special: 40, zodiac: '兔' },
    { period: '2026156', numbers: [31, 16, 11, 3, 37, 12], normal_zodiacs: ['鼠', '兔', '猴', '龙', '马', '羊'], special: 1, zodiac: '马' },
    { period: '2026155', numbers: [21, 37, 46, 13, 40, 47], normal_zodiacs: ['狗', '马', '鸡', '马', '兔', '猴'], special: 7, zodiac: '鼠' },
    { period: '2026154', numbers: [46, 28, 42, 31, 23, 34], normal_zodiacs: ['鸡', '兔', '牛', '鼠', '猴', '鸡'], special: 41, zodiac: '虎' },
];

test('screenshot combination has all three zodiacs in exactly the five advertised records', () => {
    const app = component(screenshotRows, ['兔', '鼠', '猪']);
    app.tripleRunMode = 'others';
    const pattern = app.getVisibleTripleRunPatterns().find(item => item.key === '鼠|兔|猴');
    assert.ok(pattern);
    const proof = app.getTripleRunVerification(pattern);
    assert.equal(proof[0].complete, true);
    assert.equal(proof[0].length, 5);
    assert.deepEqual(Array.from(proof[0].rows, row => row.period), screenshotRows.map(row => row.period));
    const first = proof[0].rows[0];
    assert.deepEqual(Array.from(first.hits, hit => `${hit.zodiac}:${hit.numbers.join(',')}`), ['鼠:43', '兔:特16', '猴:23']);
    assert.equal(first.balls.find(ball => ball.number === 23).hit, true);
    assert.deepEqual(app.zodiacFilters, ['兔', '鼠', '猪']);
});

test('other-combination search rejects a run with one zodiac missing from a middle draw', () => {
    const rows = screenshotRows.map(row => ({ ...row, normal_zodiacs: [...row.normal_zodiacs] }));
    rows[2].normal_zodiacs[2] = '猪'; // Replace the only monkey in the middle of the five-draw run.
    const app = component(rows, ['兔', '鼠', '猪']);
    app.tripleRunMode = 'others';
    assert.ok(!keys(app).includes('鼠|兔|猴'));
});

test('verification marks absent zodiacs instead of claiming complete coverage', () => {
    const app = component(screenshotRows, ['兔', '鼠', '猪']);
    const proof = app.getTripleRunVerification({
        zodiacs: ['鼠', '兔', '猪'],
        runs: [{ year: 2026, start: '2026158', end: '2026154', length: 5, periods: screenshotRows.map(row => row.period) }],
    });
    assert.equal(proof[0].complete, false);
    assert.equal(proof[0].rows[0].complete, false);
    assert.equal(proof[0].rows[0].hits.find(hit => hit.zodiac === '猪').numbers.length, 0);
});
