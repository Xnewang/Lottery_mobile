const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const html = fs.readFileSync(path.join(__dirname, '../server/templates/index.html'), 'utf8');
const context = vm.createContext({});
vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1], context);
const compute = (rows, range = 10) => context.computePreviousZodiacCoverage(rows, range);
const draw = (period, zodiac = '鼠', normals = Array(6).fill('鼠')) => ({
    period: String(period), date: '2026-09-01', numbers: [1, 2, 3, 4, 5, 6], special: 7,
    zodiac, normal_zodiacs: normals,
});

test('ten current draws use their own immediate predecessor, including outside the range: 6/10', () => {
    const rows = [draw(2026263, '牛')];
    for (let i = 0; i < 10; i++) rows.push(draw(2026264 + i, i < 6 ? '鼠' : i % 2 ? '虎' : '兔'));
    const result = compute(rows.reverse());
    assert.equal(result.total, 10);
    assert.equal(result.valid, 10);
    assert.equal(result.hits, 6);
    assert.equal(result.label, '6/10（60%）');
    assert.equal(result.groups[0].label, result.label);
    assert.equal(result.entries[0].period, '2026264');
    assert.equal(result.entries[0].previousPeriod, '2026263');
    assert.equal(result.entries[9].previousPeriod, '2026272');
});

test('previous seventh ball is included, not just the six normal balls', () => {
    const result = compute([draw(2026264, '猪'), draw(2026263, '猪')], 1);
    assert.equal(result.hits, 1);
    assert.equal(result.entries[0].previousBalls[6], '07猪（特）');
});

test('a normal ball hit counts; current normal balls do not determine the target', () => {
    const result = compute([draw(2026264, '兔', Array(6).fill('猪')), draw(2026263, '牛', ['兔', '鼠', '鼠', '鼠', '鼠', '鼠'])], 1);
    assert.equal(result.entries[0].hit, true);
    assert.equal(result.entries[0].zodiac, '兔');
});

test('missing predecessor is unknown, not a miss, and rows do not bridge a period gap', () => {
    const result = compute([draw(2026265), draw(2026263), draw(2026262)]);
    assert.equal(result.entries.find(e => e.period === '2026265').hit, null);
    assert.equal(result.valid, 1);
    assert.equal(result.hits, 1);
    assert.equal(result.label, '1/1（100%）');
    assert.equal(result.groups.length, 2);
});

test('incomplete or invalid previous seven balls are excluded from the denominator', () => {
    for (const broken of [
        { ...draw(2026263), normal_zodiacs: ['鼠'] },
        { ...draw(2026263), normal_zodiacs: '鼠鼠鼠鼠鼠鼠' },
        { ...draw(2026263), normal_zodiacs: ['鼠', '鼠', '鼠', '鼠', '鼠', '未知'] },
        { ...draw(2026263), special: 1 },
        { ...draw(2026263), special: 50 },
        { ...draw(2026263), numbers: [1, 2, 3] },
    ]) {
        const result = compute([draw(2026264), broken], 1);
        assert.equal(result.entries[0].hit, null);
        assert.equal(result.valid, 0);
    }
});

test('missing current special zodiac is excluded without using the present-year mapping', () => {
    const result = compute([{ ...draw(2026264), zodiac: '' }, draw(2026263)], 1);
    assert.equal(result.entries[0].hit, null);
    assert.equal(result.entries[0].reason, '当期特肖数据不完整');
});

test('New Year uses a dated Dec 31 predecessor, for either 365 or 366 issues', () => {
    for (const [year, last] of [[2025, 366], [2026, 365]]) {
        const result = compute([
            { ...draw(`${year}001`, '兔'), date: `${year}-01-01` },
            { ...draw(`${year - 1}${last}`, '兔'), date: `${year - 1}-12-31` },
        ], 1);
        assert.equal(result.entries[0].hit, true);
        assert.equal(result.entries[0].previousPeriod, `${year - 1}${last}`);
    }
    assert.equal(compute([draw(2026001), draw(2025365)], 1).entries[0].hit, null);
});

test('duplicates and unordered input do not duplicate targets; short final rows are padded', () => {
    const rows = Array.from({ length: 13 }, (_, i) => draw(2026260 + i));
    const result = compute([rows[3], ...rows.reverse()], 12);
    assert.equal(result.total, 12);
    assert.equal(result.valid, 12);
    assert.equal(result.groups.length, 2);
    assert.equal(result.groups[1].label, '2/2（100%）');
    assert.equal(result.groups[1].cells.filter(Boolean).length, 2);
    assert.equal(result.groups[1].cells.length, 10);
});

test('empty and independently replaced data sources do not reuse earlier results', () => {
    assert.equal(compute([]).total, 0);
    const app = context.app();
    app.draws = [draw(2026264, '猪'), draw(2026263, '猪')];
    app.analysisRange = 1;
    app.updateAnalysis();
    assert.equal(app.previousCoverage.hits, 1);
    app.coverageSelectedPeriod = '2026264';
    assert.ok(app.getSelectedCoverageEntry());
    app.draws = [draw(2026264, '猪'), draw(2026263, '牛')];
    app.updateAnalysis();
    assert.equal(app.previousCoverage.hits, 0);
    assert.equal(app.getSelectedCoverageEntry(), null);
});

test('a source failure is reported and a successful retry clears the error and fills coverage', async () => {
    const app = context.app();
    app.loadDrawSource = async () => { throw new Error('开奖源 HTTP 502'); };
    await app.fetchDraws();
    assert.equal(app.loading, false);
    assert.equal(app.yearError, '开奖源 HTTP 502');
    app.loadDrawSource = async function () {
        this.draws = [draw(2026264, '猪'), draw(2026263, '猪')];
        this.updateAnalysis();
    };
    await app.fetchDraws();
    assert.equal(app.yearError, '');
    assert.equal(app.loading, false);
    assert.equal(app.previousCoverage.valid, 1);
});
