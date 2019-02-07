import { describe, it, before, beforeEach, after, afterEach, expect} from './test-runner';

describe('Test context', () => {
    let x = 0;

    before(() => {
        x = 1;
    });

    beforeEach(() => {
        x = x + 1;
    });
    after(() => {
        x = 0;
    });
    afterEach(() => {
        x = x - 1;
    });

    it('task', () => {
        expect(x).toEqual(2);
    });

    it('promise', () => {
        return Promise.resolve(x);
    });

    it('fails', () => {
        expect(true).toBeTrue();
    });

    it('rejects', () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    expect(true).toBeTrue();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            }, 10);
        });
    });
});
