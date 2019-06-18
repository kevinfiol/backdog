import m from 'mithril';
import stream from 'mithril/stream';
import createActions from './actions';
import createAsyncActions from './asyncActions';

const initialState = {
    num: 0
};

const update = stream();
const state  = stream.scan((x, f) => f(x), initialState, update);

const actions      = createActions(update);
const asyncActions = createAsyncActions(actions, m.redraw);
const allActions   = Object.assign({}, actions, asyncActions);

export { state, allActions as actions };