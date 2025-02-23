class Timer {

    static add(id, func) {
        id = String(id)
        this.timer ??= {}
        this.timer[id] = func;
    };

    static clear(id) {
        id = String(id)
        if (this.timer?.[id]) {
            console.log("timer clear", id)
            clearTimeout(this.timer[id]);
            delete this.timer[id];
        }
    }
};

export default Timer;