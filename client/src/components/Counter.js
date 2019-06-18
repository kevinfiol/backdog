import m from 'mithril';
import Btn from './Btn';

const Counter = {
    view: ({ attrs: { state, actions } }) => 
        m('div',
            m('h2', state.num),

            m('div.center',
                m(Btn, { onclick: actions.incrementNum }, 'Increment'),
                m(Btn, { onclick: actions.decrementNum }, 'Decrement'),
                m(Btn, { onclick: actions.delayedIncrement }, 'Delayed Increment')
            )
        )
};

export default Counter;