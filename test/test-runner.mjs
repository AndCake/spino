import cp from 'child_process';

const tasks = {
    before: [],
    after: [],
    beforeEach: [],
    afterEach: [],
};

const threadList = [];

let queue = [];

function run(task) {
    return new Promise((resolve, reject) => {
        try {
            const result = task.fn();
            if (result && typeof result.then === 'function') {
                result.then(() => {
                    resolve({ task });
                }, reject);
            } else {
                resolve({ task });
            }
        } catch (error) {
            reject(error);
        }
    });
}

export function runAll(listOfFiles = [], results = { passed: 0, failed: 0 }) {
    if (listOfFiles.length === 0 && threadList.length === 0) {
        console.log(`\n\x1b[32m${results.passed}\x1b[0m tests passed, \x1b[31m${results.failed}\x1b[0m tests failed.`);
    }
    while (threadList.length < 5 && listOfFiles.length > 0) {
        const child = cp.fork(listOfFiles.shift());
        child.on('close', (code) => {
            if (code !== 0 && !child.messageReceived) {
                results.failed += 1;
            }
            threadList.splice(threadList.indexOf(child), 1);
            runAll(listOfFiles, results);
        });
        child.on('message', (message) => {
            if (!message.final && !message.success) {
                console.error(`\x1b[31mx ${message.context} - ${message.name}: ${message.error}\x1b[0m\x1b[2m\n${message.stack}\n\x1b[0m`);
            } else if (message.final) {
                results.passed += message.passed;
                results.failed += message.rejected;
                child.messageReceived = true;
                if (message.success) {
                    console.log(`\x1b[32m√ ${message.context} (${message.duration}ms)\x1b[0m`);
                } else {
                    console.error(`\x1b[31mx ${message.context}\x1b[0m`);
                }
            }
        });
        threadList.push(child);
    }
}

function notify(message) {
    if (typeof process !== 'undefined' && typeof process.send === 'function') {
        process.send(message);
    } else if (!message.final) {
        if (message.success) {
            console.log(`\x1b[32m√ ${message.context} - ${message.name} (${message.duration}ms)\x1b[0m`);
        } else {
            console.error(`\x1b[31mx ${message.context} - ${message.name}: ${message.error}\x1b[0m\x1b[2m\n${message.stack}\n\x1b[0m`);
        }
    } else if (message.final) {
        if (message.success) {
            console.log(`\x1b[32m√ ${message.context} (${message.duration}ms)\x1b[0m`);
        } else {
            console.error(`\x1b[31mx ${message.context}\x1b[0m`);
        }
        console.log(`\n\x1b[32m${message.passed}\x1b[0m tests passed, \x1b[31m${message.rejected}\x1b[0m tests failed.`);
    }
}

export function describe(context = '', callback = () => {}) {
    // register all contained tasks
    callback();

    let passed = 0;
    let rejected = 0;
    let describeStart = Date.now();

    Promise.resolve().then(() => {
        return Promise.all(tasks.before.map(runnable => runnable.fn()));
    }).then(() => {
        const list = queue;
        const runTask = () => {
            if (list.length <= 0) return Promise.resolve();
            const runnable = list.shift();
            let start = Date.now();
            return Promise.resolve().then(() => {
                return Promise.all(tasks.beforeEach.map(run));
            }).then(() => run(runnable)).then(() => {
                return Promise.all(tasks.afterEach.map(run));
            }).then(() => {
                passed += 1;
                notify({
                    success: true,
                    context,
                    name: runnable.name,
                    duration: Date.now() - start,
                });
            }).catch(err => {
                rejected += 1;
                notify({
                    success: false,
                    context,
                    name: runnable.name,
                    error: err.message,
                    stack: err.stack.toString(),
                });
            }).then(runTask);
        }
        return runTask();
    }).then(() => {
        return Promise.all(tasks.after.map(runnable => runnable.fn()));
    }).then(() => {
        notify({
            success: rejected === 0,
            final: true,
            context,
            rejected,
            passed,
            duration: Date.now() - describeStart,
        });

        if (rejected > 0) {
            process.exit(1);
        }
    });
}

export function it(context, callback) {
    queue.push({name: context, fn: callback});
}

export function before(callback) {
    tasks.before.push({name: 'before', fn: callback});
}

export function after(callback) {
    tasks.after.unshift({name: 'after', fn: callback});
}

export function beforeEach(callback) {
    tasks.beforeEach.push({name: 'beforeEach', fn: callback});
}

export function afterEach(callback) {
    tasks.afterEach.unshift({name: 'afterEach', fn: callback});
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}.`);
    }
}

function deepEqual(objA, objB) {
    if (objA === null && objB === null) return true;
    if (objA === null) return false;
    if (objB === null) return false;
    if (Object.keys(objB).length !== Object.keys(objA)) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.join('\0') !== keysB.join('\0')) return false;

    for (let i = 0, len = keysA.length, key; key = keysA[i], i < len; i += 1) {
        if (typeof objA[key] === 'object' && typeof objB[key] === 'object') {
            if (!deepEqual(objA[key], objB[key])) {
                return false;
            }
        }
        if (objA[key] !== objB[key]) {
            return false;
        }
    }
    return true;
}

export function expect(actual, message) {
    return {
        toEqual(expected) {
            assert(actual === expected, message || `${actual} is not equal to ${expected}`);
        },
        toInclude(expected) {
            const msg = message || `${actual} does not contain ${expected}`;
            if (Array.isArray(actual) || typeof actual === 'string') {
                assert(actual.indexOf(expected) >= 0, msg);
            } else if (typeof actual === 'number' && typeof expected === 'number') {
                assert(actual % expected === 0, msg);
            } else if (typeof actual === 'object') {
                assert(actual[expected], msg);
            }
        },
        toBeTrue() {
            assert(actual === true, message || `${actual} is not true`);
        },
        toBeFalse() {
            assert(actual === false, message || `${actual} is false`);
        },
        toBeA(type) {
            const msg = message || `${actual} is a ${typeof actual}, but not a ${type}`;
            if (typeof type === 'string') {
                assert(typeof actual === type, msg);
            } else {
                assert(actual instanceof type, msg);
            }
        },
        toExist() {
            assert(actual, message || `${actual} does not exist`);
        },
        toNotExist() {
            assert(!actual, message || `${actual} does exist`);
        },
        toBeEmpty() {
            const msg = message || `${actual} is not empty`;
            if (Array.isArray(actual) || typeof actual === 'string') {
                assert(actual.length === 0, msg);
            } else if (typeof actual === 'object') {
                assert(Object.keys(actual).length === 0, msg);
            } else {
                throw new TypeError(`Unexpected type for ${actual} (${typeof actual})`);
            }
        },
        toBeNotEmpty() {
            const msg = message || `${actual} is empty`;
            if (Array.isArray(actual) || typeof actual === 'string') {
                assert(actual.length !== 0, msg);
            } else if (typeof actual === 'object') {
                assert(Object.keys(actual).length !== 0, msg);
            } else {
                throw new TypeError(`Unexpected type for ${actual} (${typeof actual})`);
            }
        },
        toDeepEqual(expected) {
            assert(deepEqual(actual, expected), message || `${JSON.stringify(actual)} is not deep equal to ${expected}`);
        }
    }
}
