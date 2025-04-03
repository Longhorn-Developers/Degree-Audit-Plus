/*
 * example test file using Vitest
 */

import { describe, it, expect } from 'vitest';

describe('Example Test Suite', () => {
    it('should add two numbers correctly', () => {
        const add = (a: number, b: number) => a + b;
        expect(add(2, 3)).toBe(5);
    });
});