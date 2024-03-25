import { Dialute, SberRequest } from 'dialute';
import { data } from './data';


const heroes = data;


function choice(choices: any, drop = false) {
  const index = Math.floor(Math.random() * choices.length);
  let chosen = choices[index];
  if (drop) {
    choices.splice(index, 1);
  }
  return chosen;
}

function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function* script(r: SberRequest) {
  const rsp = r.buildRsp();
  
  let unusedheroes = [...heroes];
  const state = {
    count: 0,
    place: {name: '', iso: ''},
    variants: [] as any[],
    lifes: 3,
    endGame: false
  }

  function updateState() {
    let place = choice(unusedheroes, true);
    let variants = [] as any[];
    let temp_variants = [] as any[]
    variants.push({name: place.name, used: false});
    temp_variants.push(place.name);
    
    let i = 0
    while (i < 3){
      let temp = choice(heroes);
      if (temp_variants.includes(temp.name)){
        continue
      }
      variants.push({name: temp.name, used: false});
      temp_variants.push(temp.name);
      i++;
    } 

    shuffle(variants);
    state.place = place;
    state.variants = variants;
    rsp.data = state;
  }

  function newGame(){
    unusedheroes = [...heroes];
    state.count = 0;
    state.place = {name: '', iso: ''};
    state.variants = [] as any[];
    state.lifes = 3;
  }

  function loseGame(){
    rsp.msg = 'К сожалению, вы проиграли. Вы можете начать заново, сказав «Заново»';
    rsp.msgJ = 'Эх, ты проиграл. Ты можешь начать заново, сказав «Заново»';
    rsp.kbrd = ['Заново']
    state.endGame = true;
    rsp.end = true;
  }

  function useButton(place: any) {
    for (const [i, v] of state.variants.entries()) {
      if (place.toLowerCase() === v.name.toLowerCase()) {
        state.variants[i].used = true;
      }
    }
  }

  function afterCorrect() {
    updateState();
    state.count++;
    rsp.msg = choice(['Правильно!', 'Здорово!', 'Потрясающе!', 'Угадали!', 'Браво!', 'Вы молодец!']);
    rsp.msgJ = choice(['Правильно!', 'Здорово!', 'Потрясающе!', 'Верно!', 'Браво!', 'Молодец!']);
  }

  function afterWrong(useButtons = true){
    if (r.type == 'SERVER_ACTION'){
      if (useButtons){
        useButton(r.act.data);
      }
    } else{
      if (useButtons){
        useButton(r.msg);
      }
    }
    rsp.msg = choice(['Не угадали!', 'Неверно!', 'Неправильно!']);
    rsp.msgJ = choice(['Не угадал!', 'Неверно!', 'Неправильно!']);
    state.lifes -= 1;
    if (state.lifes <= 0){
      loseGame();
    }
  }

  updateState();
  rsp.msg = 'Добро пожаловать в викторину по Доте ' +
  'Вы должны угадать героя по картинке. Если возникнут вопросы, скажите Помощь. ' +
  'Вопросы можно пропускать, сказав Пропуск, а вот и первый герой ';
  rsp.msgJ = 'Привет! Ты в в викторине по Доте. ' +
  'Ты должен угадать героя по картинке. Если возникнут вопросы, скажи Помощь. ' +
  'Вопросы можно пропускать, сказав Пропуск, но ты потеряешь жизнь.';
  rsp.kbrd = ['Помощь', 'Далее'];

  yield rsp;

  while (unusedheroes.length >= 1){
    if (r.type === 'SERVER_ACTION'){
      if (r.act?.action_id == 'click'){
        if (r.act.data == state.place.name){
          afterCorrect();
        }
        else{ 
          afterWrong();
        }
      }
      yield rsp;
      continue;
    }
    if (r.msg.toString().replace(/-/g, ' ').toLowerCase() === state.place.name.toString().replace(/-/g, ' ').toLowerCase()) {
      afterCorrect();
    }
    else if (r.nlu.lemmaIntersection(['выход', 'выйти', 'выйди'])) {
      rsp.msg = 'Всего вам доброго!'
      rsp.msgJ = 'Еще увидимся. Пока!'
      rsp.end = true;
      rsp.data = {'type': 'close_app'}
    }

    else if (r.nlu.lemmaIntersection(['помощь', 'помочь'])) {
      rsp.msg = 'Добро пожаловать в викторину по Доте. ' +
      'Вы должны угадать героя по картинке. Если возникнут вопросы, скажите Помощь. ' +
      'Вопросы можно пропускать, сказав Пропуск, но Вы потеряете жизнь.';
      rsp.msgJ = 'Привет! Ты в в викторине по Доте. ' +
      'Ты должен угадать героя по картинке. Если возникнут вопросы, скажи Помощь. ' +
      'Вопросы можно пропускать, сказав Пропуск, но ты потеряешь жизнь.';
    }

    else if (r.nlu.lemmaIntersection(['следующий', 'пропуск']) || ['пропуск', 'следующий'].includes(r.msg.toLowerCase())) {
      state.lifes -= 1;
      updateState();
      if (state.lifes <= 0){
        loseGame();
      }
      else{ 
        rsp.msg = 'Обновляю'
      }
    }
    else if (r.nlu.lemmaIntersection(['заново', 'начать заново', 'новая игра'])){
      newGame();
      updateState(); 
      rsp.msg = 'Добро пожаловать в викторину по Доте. ' +
      'Вы должны угадать героя по картинке. Если возникнут вопросы, скажите Помощь. ' +
      'Вопросы можно пропускать, сказав Пропуск, а вот и первый герой ';
      rsp.msgJ = 'ривет! Ты в в викторине по Доте. ' +
      'Ты должен угадать героя по картинке. Если возникнут вопросы, скажи Помощь. ' +
      'Вопросы можно пропускать, сказав Пропуск, а вот и первый герой ';
    }else if(r.msg.toString().toLowerCase() === 'запусти викторину по доте'){
      rsp.msg = 'Добро пожаловать обратно в игру'
      rsp.msgJ = 'Давно не виделись! Продолжай играть'
    }
    else{
      afterWrong();
    }
    yield rsp;
  }
  rsp.msg = 'Поздравляю! Вы титаны!'
  rsp.msgJ = 'Поздравляю! Ты легенда!'
  state.count++;
  state.endGame = true;
  rsp.kbrd = ['Заново'];
  rsp.end = true;
  
  yield rsp;
}

Dialute
  .fromEntrypoint(script as GeneratorFunction)
  .shareApp('../app/public')
  .start();
