import { assertEquals, assertThrows } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import DateMoment from "../src/lib/utils/datemoment.ts";

const { test } = Deno;

test({
    name: "Should be true when the compared date is before", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        assertEquals(true, todayMoment.isSameOrBefore(todayMoment.getDate(), "11:00"));
    }
});

test({
    name: "Should be false when the compared date is not before", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        assertEquals(false, todayMoment.isSameOrBefore(todayMoment.getDate(), "09:00"));
    }
});

test({
    name: "Should be true when the compared date is after", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        assertEquals(true, todayMoment.isSameOrAfter(todayMoment.getDate(), "09:00"));
    }
});

test({
    name: "Should be false when the compared date is not after", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        assertEquals(false, todayMoment.isSameOrAfter(todayMoment.getDate(), "11:00"));
    }
});

test({
    name: "Should be true when the compared date is in between", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        assertEquals(true, todayMoment.isBetween(todayMoment.getDate(), todayMoment.getDate(), "09:00", "10:30"));
    }
});

test({
    name: "Should be false when the compared date is not in between", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        assertEquals(false, todayMoment.isBetween(todayMoment.getDate(), todayMoment.getDate(), "10:01", "10:30"));
    }
});

test({
    name: "Should add 1 second to date", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        const beforeAdding = todayMoment.getDate().getSeconds();
        const afterAdding = todayMoment.add(1, "s").getDate().getSeconds();
        const diff = afterAdding - beforeAdding;
        assertEquals(true, diff == 1);
    }
});

test({
    name: "Should add 1 minute to date", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        const beforeAdding = todayMoment.getDate().getMinutes();
        const afterAdding = todayMoment.add(1, "m").getDate().getMinutes();
        assertEquals(true, (afterAdding - beforeAdding) == 1);
    }
});

test({
    name: "Should add 1 hour to date", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        const beforeAdding = todayMoment.getDate().getHours();
        const afterAdding = todayMoment.add(1, "h").getDate().getHours();
        assertEquals(true, (afterAdding - beforeAdding) == 1);
    }
});

test({
    name: "Should return error for using not compatible unit", 
    fn(): void {
        const todayMoment = new DateMoment(new Date(), "10:00");
        assertThrows(() => todayMoment.add(1, "x"), "Unit x not compatible - try [s, m or h]");
    }
});