const asyncActions = (actions, redraw) => ({
    delayedIncrement: () => {
        setTimeout(() => {
            actions.incrementNum();
            redraw();
        }, 1000);
    }
});

export default asyncActions;