import test from 'node:test';
import assert from 'node:assert/strict';
const {tr,lang}=await import('../src/i18n.js');
const CYR=/[А-Яа-яЄєІіЇїҐґ]/;

test('English translation runs every pattern and leaves no Ukrainian in core game lines',t=>{
 if(lang!=='en'){t.skip('runtime language is not English here');return;}
 for(const line of ['Монети','Продано 4 · +28 монет. Тепер Люсі платить 6 за 1 — склад повнішає.','Команда повернулась! +10 монет і +2 кристали.',
  'Вилупиться за 0:05 · даватиме ягоди','Годування 1/3 — потім дорослий','Рівень 2 · залишається вдома','Ще потрібно: 102 монети, 34 кристали',
  'Підніми долину: 140 монет і 55 кристалів. Усі дракони даватимуть ще +10%.','Морозні вершини ще під туманом — відкриється в наступних оновленнях.','+3 ягоди','+2 кристали','кожні 12 с','Зараз','Реєстр поки знає лише Мохолиста, Жарика й Кременя — цей вид додамо в наступному оновленні контракту.']){
  const out=tr(line);assert.ok(!CYR.test(out),`untranslated: "${line}" → "${out}"`);
 }
});
