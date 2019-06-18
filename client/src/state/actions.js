const actions = update => ({
    incrementNum: () => update(state => {
        state.num += 1;
        return state;
    }),

    decrementNum: () => update(state => {
        state.num -= 1;
        return state;
    })
});

export default actions;