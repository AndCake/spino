import { describe, it, expect, spy } from 'chawan';
import Document from 'nano-dom/src/dom';
import * as utils from './utils';

describe('utils', () => {
    describe('getCircularReplacer', () => {
        it('generates a function', () => {
            const actual = utils.getCircularReplacer();
            expect(actual).toBeA('function');
        });
        it('can detect duplicate entries', () => {
            const myEntry = {};
            const replacer = utils.getCircularReplacer();
            expect(replacer(0, myEntry)).toEqual(myEntry);
            expect(replacer(0, myEntry)).toNotExist();
        });
    });
    describe('vdomClone', () => {
        it('can deal with text nodes', () => {
            const document = new Document();
            const actual = utils.vdomClone(document.createTextNode('test'));
            expect(actual).toEqual('test');
        });
        it('can deal with missing attributes and children', () => {
            const callback = spy();
            utils.vdomClone({
                nodeName: 'x'
            }, callback);
            expect(callback).toHaveBeenCalled();
            expect(callback.lastArgs[0]).toEqual('x');
            expect(callback.lastArgs[1]).toBeEmpty();
            expect(callback.lastArgs[2]).toBeEmpty();
        });
        it('can recursively deal with tags', () => {
            const result = utils.vdomClone({
                nodeName: 'x',
                childNodes: [{
                    nodeName: 'y'
                }, 'test']
            }, (node, attrs, children) => `<${node}>${children.join('')}</${node}>`);
            expect(result).toEqual('<x><y></y>test</x>');
        });
    });
});
