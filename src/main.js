import * as R from 'ramda';

import { map, filter, scan, flatMap, delay } from 'rxjs/operators';
import { Observable, Subject, fromEvent, pipe, of, from, merge, interval } from 'rxjs';

import initialState from './data';
import { filterRectangle, getArrayWithRandomElement, playSequence } from './helpers';
import { renderToDom } from './view';

import { makeBlinking } from './blick';

// Anonymous function to prevent the filling of global space
(() => {

  let app = document.querySelector(`#app`);
  let click$ = fromEvent(document, `click`);

  renderToDom(initialState);


  // Block intents
  let intents = {
    startGame$: click$.pipe(
      filter(event => event.target.classList.contains(`btn-start`)),
      map(_ => true)
    ),

    solveStep$: click$.pipe(
      filter(event => filterRectangle(event.target.dataset.color)),
      map(event => event.target),
      map(elem => elem.dataset.color)
    ),

    endGame$: click$.pipe(
      filter(event => event.target.classList.contains(`btn-end`)),
      map(_ => true)
    ),

    blink$: makeBlinking(initialState.expectedClicks, initialState.expectedClicks.length * 2, 1000, 1000)
  }


  // Action block (depends on intents)
  let action$ = merge(
    intents.startGame$.pipe(
      map(_ => function startGame(state) {
        return Object.assign({}, state, {started: true})
      })
    ),

    intents.solveStep$.pipe(
      map(color => function(state) {
        return Object.assign({}, state, {actualClicks: state.actualClicks.concat(color)})
      })
    ),

    intents.blink$.pipe(
      map(obj => function startGame(state) {
        return Object.assign({}, state, {glare: obj});
      })
    )
  )


  // Subject
  let actionPool$ = new Subject();
  let actions$ = merge(actionPool$, action$);


  // State block (depends on action)
  let state$ = actions$.pipe(
    scan((state, changeFun) => changeFun(state), initialState)
  )


  // Render block
  state$.subscribe(state => {
    console.log(state);
    renderToDom(state);

    if (!R.isEmpty(state.actualClicks)) {

      if (R.startsWith(state.actualClicks, state.expectedClicks) && state.actualClicks.length == state.expectedClicks.length) {
        actionPool$.next((state) => {
          return Object.assign(
            {},
            state,
            {
              expectedClicks: getArrayWithRandomElement(state.expectedClicks),
              actualClicks: [],
              score: state.score + 1
            }
          )
        });
      }

      else if (!R.startsWith(state.actualClicks, state.expectedClicks)) {
        actionPool$.next((state) => {
          return Object.assign(
            {},
            state,
            {
              actualClicks: [],
              ended: true
            }
          )
        });
      }
    }
  });
})();
