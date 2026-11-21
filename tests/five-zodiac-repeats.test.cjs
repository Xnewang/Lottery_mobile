const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const html = fs.readFileSync(path.join(__dirname, '../server/templates/index.html'), 'utf8');
const context = vm.createContext({});
vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1], context);
const app = context.app();

test('322期 counts the special ball as the third rat and lists all three numbers', () => {
    const row = { numbers:[47,31,43,17,8,30], normal_zodiacs:['猴','鼠','鼠','虎','猪','牛'], special:7, zodiac:'鼠' };
    assert.equal(app.getDrawZodiacCount(row), 5);
    const info = app.getFiveZodiacRepeatInfo(row);
    assert.equal(info.hasTriple, true);
    assert.equal(info.text, '鼠开了3个：31、43、特07');
});

test('320期 is a two-plus-two pattern, not a three-ball pattern', () => {
    const row = { numbers:[14,17,32,34,24,46], normal_zodiacs:['蛇','虎','猪','鸡','羊','鸡'], special:20, zodiac:'猪' };
    assert.equal(app.getDrawZodiacCount(row), 5);
    const info = app.getFiveZodiacRepeatInfo(row);
    assert.equal(info.hasTriple, false);
    assert.match(info.text, /^没有生肖开3个/);
    assert.match(info.text, /鸡开了2个：34、46/);
    assert.match(info.text, /猪开了2个：32、特20/);
});

test('a triple among normal balls uses the record zodiac metadata', () => {
    const row = { numbers:[1,2,3,4,5,6], normal_zodiacs:['兔','兔','兔','龙','蛇','马'], special:7, zodiac:'羊' };
    const info = app.getFiveZodiacRepeatInfo(row);
    assert.equal(info.hasTriple, true);
    assert.equal(info.text, '兔开了3个：01、02、03');
});

test('other zodiac counts and invalid seven-ball records do not show five-zodiac hints', () => {
    for (const row of [null, {numbers:[1,2,3,4,5,6],normal_zodiacs:['鼠','牛','虎','兔','龙','蛇'],special:7,zodiac:'马'}, {numbers:[1,2],special:3}]) {
        assert.equal(app.getFiveZodiacRepeatInfo(row).text, '');
    }
});
