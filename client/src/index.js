import 'ace-css/css/ace.min.css';
import './styles/main.css';

import m from 'mithril';
import { state, actions } from './state';

import Counter from './components/Counter';

const App = {
    view: ({ attrs: { state, actions } }) =>
        m('div.px3.max-width-3.mx-auto',
            m('h1', 'Mithril Starter'),
            m('p', 'This is a sample Mithril.js application. It uses the Meiosis State Management Pattern.'),
            m(Counter, { state, actions })
        )
};

m.mount(document.getElementById('app'), {
    view: () => m(App, { state: state(), actions })
});