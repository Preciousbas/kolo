#[test_only]
module kolo_circle::circle_tests;

use kolo_circle::circle::{Self, Circle};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario as ts;

const A: address = @0xA;
const B: address = @0xB;
const C: address = @0xC;
const OUTSIDER: address = @0xD;

fun pay(s: &mut ts::Scenario, who: address, amount: u64) {
    s.next_tx(who);
    let mut c = s.take_shared<Circle<SUI>>();
    let coin = coin::mint_for_testing<SUI>(amount, s.ctx());
    circle::contribute(&mut c, coin, s.ctx());
    ts::return_shared(c);
}

#[test]
fun full_round_pays_first_member() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, false, s.ctx());
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    s.next_tx(B);
    let mut c = s.take_shared<Circle<SUI>>();
    circle::payout(&mut c, s.ctx());
    assert!(circle::round(&c) == 1);
    ts::return_shared(c);
    s.next_tx(A);
    let got = s.take_from_address<Coin<SUI>>(A);
    assert!(got.value() == 300);
    ts::return_to_address(A, got);
    s.end();
}

#[test, expected_failure(abort_code = circle::ERoundIncomplete)]
fun payout_blocked_until_all_paid() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, false, s.ctx());
    pay(&mut s, A, 100); pay(&mut s, B, 100);
    s.next_tx(A);
    let mut c = s.take_shared<Circle<SUI>>();
    circle::payout(&mut c, s.ctx());
    ts::return_shared(c);
    s.end();
}

#[test]
fun auto_payout_on_last_contribution() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, true, s.ctx());
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    s.next_tx(A);
    let c = s.take_shared<Circle<SUI>>();
    assert!(circle::round(&c) == 1);
    assert!(circle::pot_value(&c) == 0);
    ts::return_shared(c);
    s.next_tx(A);
    let got = s.take_from_address<Coin<SUI>>(A);
    assert!(got.value() == 300);
    ts::return_to_address(A, got);
    s.end();
}

#[test]
fun manual_mode_needs_release() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, false, s.ctx());
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    s.next_tx(A);
    let mut c = s.take_shared<Circle<SUI>>();
    assert!(circle::pot_value(&c) == 300);
    assert!(circle::round(&c) == 0);
    circle::payout(&mut c, s.ctx());
    assert!(circle::round(&c) == 1);
    assert!(circle::pot_value(&c) == 0);
    ts::return_shared(c);
    s.next_tx(A);
    let got = s.take_from_address<Coin<SUI>>(A);
    assert!(got.value() == 300);
    ts::return_to_address(A, got);
    s.end();
}

#[test]
fun full_cycle_pays_each_member_once() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, true, s.ctx());
    // round 0 → A
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    // round 1 → B
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    // round 2 → C
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);

    s.next_tx(A);
    let c = s.take_shared<Circle<SUI>>();
    assert!(circle::is_finished(&c));
    ts::return_shared(c);

    s.next_tx(A);
    let a_coin = s.take_from_address<Coin<SUI>>(A);
    assert!(a_coin.value() == 300);
    ts::return_to_address(A, a_coin);
    s.next_tx(B);
    let b_coin = s.take_from_address<Coin<SUI>>(B);
    assert!(b_coin.value() == 300);
    ts::return_to_address(B, b_coin);
    s.next_tx(C);
    let c_coin = s.take_from_address<Coin<SUI>>(C);
    assert!(c_coin.value() == 300);
    ts::return_to_address(C, c_coin);
    s.end();
}

#[test, expected_failure(abort_code = circle::EFinished)]
fun finished_rejects_contribute() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, true, s.ctx());
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    pay(&mut s, A, 100);
    s.end();
}

#[test, expected_failure(abort_code = circle::EWrongAmount)]
fun wrong_amount_rejected() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, false, s.ctx());
    pay(&mut s, A, 99);
    s.end();
}

#[test, expected_failure(abort_code = circle::ENotMember)]
fun non_member_rejected() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, false, s.ctx());
    pay(&mut s, OUTSIDER, 100);
    s.end();
}

#[test, expected_failure(abort_code = circle::EAlreadyPaid)]
fun double_pay_rejected() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, false, s.ctx());
    pay(&mut s, A, 100);
    pay(&mut s, A, 100);
    s.end();
}

#[test, expected_failure(abort_code = circle::ERoundIncomplete)]
fun payout_after_auto_fails() {
    let mut s = ts::begin(A);
    circle::create<SUI>(vector[A, B, C], 100, true, s.ctx());
    pay(&mut s, A, 100); pay(&mut s, B, 100); pay(&mut s, C, 100);
    // round advanced; next round incomplete → manual payout aborts ERoundIncomplete
    s.next_tx(A);
    let mut c = s.take_shared<Circle<SUI>>();
    circle::payout(&mut c, s.ctx());
    ts::return_shared(c);
    s.end();
}

fun take_circle(s: &mut ts::Scenario): Circle<SUI> {
    s.take_shared<Circle<SUI>>()
}

#[test]
fun open_join_until_full() {
    let mut s = ts::begin(A);
    circle::open<SUI>(3, 100, true, s.ctx());
    s.next_tx(B);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(C);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    assert!(circle::members(&c).length() == 3);
    assert!(circle::is_open(&c));
    ts::return_shared(c);
    s.end();
}

#[test, expected_failure(abort_code = circle::EFull)]
fun open_join_when_full_aborts() {
    let mut s = ts::begin(A);
    circle::open<SUI>(3, 100, true, s.ctx());
    s.next_tx(B);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(C);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(OUTSIDER);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.end();
}

#[test, expected_failure(abort_code = circle::EAlreadyMember)]
fun double_join_aborts() {
    let mut s = ts::begin(A);
    circle::open<SUI>(6, 100, true, s.ctx());
    s.next_tx(B);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.end();
}

#[test, expected_failure(abort_code = circle::ENotOpen)]
fun join_after_start_aborts() {
    let mut s = ts::begin(A);
    circle::open<SUI>(6, 100, true, s.ctx());
    s.next_tx(B);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(C);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(A);
    let mut c = take_circle(&mut s);
    circle::start(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(OUTSIDER);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.end();
}

#[test, expected_failure(abort_code = circle::ENotCreator)]
fun non_creator_start_aborts() {
    let mut s = ts::begin(A);
    circle::open<SUI>(6, 100, true, s.ctx());
    s.next_tx(B);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(C);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(B);
    let mut c = take_circle(&mut s);
    circle::start(&mut c, s.ctx());
    ts::return_shared(c);
    s.end();
}

#[test, expected_failure(abort_code = circle::ETooFew)]
fun start_with_two_members_aborts() {
    let mut s = ts::begin(A);
    circle::open<SUI>(6, 100, true, s.ctx());
    s.next_tx(B);
    let mut c = take_circle(&mut s);
    circle::join(&mut c, s.ctx());
    ts::return_shared(c);
    s.next_tx(A);
    let mut c = take_circle(&mut s);
    circle::start(&mut c, s.ctx());
    ts::return_shared(c);
    s.end();
}

#[test, expected_failure(abort_code = circle::EBadSize)]
fun open_size_too_small_aborts() {
    let mut s = ts::begin(A);
    circle::open<SUI>(2, 100, true, s.ctx());
    s.end();
}

#[test, expected_failure(abort_code = circle::EBadSize)]
fun open_size_too_large_aborts() {
    let mut s = ts::begin(A);
    circle::open<SUI>(7, 100, true, s.ctx());
    s.end();
}

#[test, expected_failure(abort_code = circle::ENotStarted)]
fun contribute_before_start_aborts() {
    let mut s = ts::begin(A);
    circle::open<SUI>(6, 100, true, s.ctx());
    pay(&mut s, A, 100);
    s.end();
}
