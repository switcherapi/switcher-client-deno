import { assertThrows, assertFalse } from 'https://deno.land/std@0.176.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/std@0.176.0/testing/bdd.ts';
import { assertTrue } from './helper/utils.ts';
import DateMoment from '../src/lib/utils/datemoment.ts';

describe('DateMoment tests:', function () {
    it('should be true when the compared date is before', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assertTrue(todayMoment.isSameOrBefore(todayMoment.getDate(), '11:00'));
    });

    it('should be false when the compared date is not before', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assertFalse(todayMoment.isSameOrBefore(todayMoment.getDate(), '09:00'));
    });

    it('should be true when the compared date is after', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assertTrue(todayMoment.isSameOrAfter(todayMoment.getDate(), '09:00'));
    });

    it('should be false when the compared date is not after', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assertFalse(todayMoment.isSameOrAfter(todayMoment.getDate(), '11:00'));
    });

    it('should be true when the compared date is in between', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assertTrue(todayMoment.isBetween(todayMoment.getDate(), todayMoment.getDate(), '09:00', '10:30'));
    });

    it('should be false when the compared date is not in between', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assertFalse(todayMoment.isBetween(todayMoment.getDate(), todayMoment.getDate(), '10:01', '10:30'));
    });

    it('should add 1 second to date', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        const beforeAdding = todayMoment.getDate().getSeconds();
        const afterAdding = todayMoment.add(1, 's').getDate().getSeconds();
        const diff = afterAdding - beforeAdding;
        assertTrue(diff == 1);
    });

    it('should add 1 minute to date', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        const beforeAdding = todayMoment.getDate().getMinutes();
        const afterAdding = todayMoment.add(1, 'm').getDate().getMinutes();
        assertTrue((afterAdding - beforeAdding) == 1);
    });

    it('should add 1 hour to date', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        const beforeAdding = todayMoment.getDate().getHours();
        const afterAdding = todayMoment.add(1, 'h').getDate().getHours();
        assertTrue((afterAdding - beforeAdding) == 1);
    });

    it('should return error for using not compatible unit', function () {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assertThrows(() => todayMoment.add(1, 'x'), 'Unit x not compatible - try [s, m or h]');
    });
});