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
