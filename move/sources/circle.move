/// SPIKE ONLY: minimal rotating-savings (ajo/esusu) escrow, generic over coin type T
/// (USDC in production). Not audited. Each round every member deposits `amount`;
/// once all have paid, the pot goes to the member whose turn it is.
/// SPIKE ONLY, not audited.
module kolo_circle::circle;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, ID, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

const ENotMember: u64 = 0;
const EWrongAmount: u64 = 1;
const EAlreadyPaid: u64 = 2;
const ERoundIncomplete: u64 = 3;
const EFinished: u64 = 4;
const EAlreadyPaidOut: u64 = 5;
const ENotOpen: u64 = 6;
const EFull: u64 = 7;
const EAlreadyMember: u64 = 8;
const ENotCreator: u64 = 9;
const ETooFew: u64 = 10;
const EBadSize: u64 = 11;
const ENotStarted: u64 = 12;
const EAlreadyStarted: u64 = 13;

const MIN_MEMBERS: u64 = 3;
const MAX_MEMBERS: u64 = 6;

public struct Circle<phantom T> has key {
    id: UID,
    members: vector<address>, // payout order = join order once started
    amount: u64,
    round: u64,
    paid: vector<bool>,
    paid_out: vector<bool>,
    auto_payout: bool,
    creator: address,
    pot: Balance<T>,
    open: bool,
    started: bool,
    max_members: u64,
}

public struct Created has copy, drop {
    circle: ID,
    members: vector<address>,
    amount: u64,
    auto_payout: bool,
}

public struct Contributed has copy, drop {
    circle: ID,
    member: address,
    round: u64,
    amount: u64,
    round_complete: bool,
}

public struct PaidOut has copy, drop {
    circle: ID,
    to: address,
    round: u64,
    amount: u64,
    auto: bool,
}

public fun create<T>(
    members: vector<address>,
    amount: u64,
    auto_payout: bool,
    ctx: &mut TxContext,
) {
    let n = members.length();
    let mut paid = vector[];
    let mut paid_out = vector[];
    let mut i = 0;
    while (i < n) {
        paid.push_back(false);
        paid_out.push_back(false);
        i = i + 1;
    };
    let circle = Circle<T> {
        id: object::new(ctx),
        members,
        amount,
        round: 0,
        paid,
        paid_out,
        auto_payout,
        creator: tx_context::sender(ctx),
        pot: balance::zero(),
        open: false,
        started: true,
        max_members: n,
    };
    event::emit(Created {
        circle: object::id(&circle),
        members: *&circle.members,
        amount,
        auto_payout,
    });
    transfer::share_object(circle);
}

/// Open circle: creator is member 0. Others join until start(). Default cap is 6.
public fun open<T>(
    max_members: u64,
    amount: u64,
    auto_payout: bool,
    ctx: &mut TxContext,
) {
    assert!(max_members >= MIN_MEMBERS && max_members <= MAX_MEMBERS, EBadSize);
    let creator = tx_context::sender(ctx);
    let circle = Circle<T> {
        id: object::new(ctx),
        members: vector[creator],
        amount,
        round: 0,
        paid: vector[false],
        paid_out: vector[false],
        auto_payout,
        creator,
        pot: balance::zero(),
        open: true,
        started: false,
        max_members,
    };
    event::emit(Created {
        circle: object::id(&circle),
        members: *&circle.members,
        amount,
        auto_payout,
    });
    transfer::share_object(circle);
}

public fun join<T>(c: &mut Circle<T>, ctx: &mut TxContext) {
    assert!(c.open && !c.started, ENotOpen);
    let who = ctx.sender();
    let (found, _) = c.members.index_of(&who);
    assert!(!found, EAlreadyMember);
    assert!(c.members.length() < c.max_members, EFull);
    c.members.push_back(who);
    c.paid.push_back(false);
    c.paid_out.push_back(false);
}

public fun start<T>(c: &mut Circle<T>, ctx: &mut TxContext) {
    assert!(ctx.sender() == c.creator, ENotCreator);
    assert!(!c.started, EAlreadyStarted);
    assert!(c.open, ENotOpen);
    assert!(c.members.length() >= MIN_MEMBERS, ETooFew);
    c.open = false;
    c.started = true;
    c.round = 0;
}

public fun contribute<T>(c: &mut Circle<T>, pay: Coin<T>, ctx: &mut TxContext) {
    assert!(c.started, ENotStarted);
    assert!(c.round < c.members.length(), EFinished);
    let (found, idx) = c.members.index_of(&ctx.sender());
    assert!(found, ENotMember);
    assert!(!c.paid[idx], EAlreadyPaid);
    assert!(pay.value() == c.amount, EWrongAmount);
    *&mut c.paid[idx] = true;
    c.pot.join(pay.into_balance());

    let mut complete = true;
    let mut i = 0;
    while (i < c.paid.length()) {
        if (!c.paid[i]) {
            complete = false;
            break
        };
        i = i + 1;
    };

    event::emit(Contributed {
        circle: object::id(c),
        member: ctx.sender(),
        round: c.round,
        amount: c.amount,
        round_complete: complete,
    });

    if (c.auto_payout && complete) {
        do_payout(c, true, ctx);
    };
}

/// Anyone can trigger; funds only ever go to the scheduled recipient.
public fun payout<T>(c: &mut Circle<T>, ctx: &mut TxContext) {
    assert!(c.round < c.members.length(), EFinished);
    let mut i = 0;
    while (i < c.paid.length()) {
        assert!(c.paid[i], ERoundIncomplete);
        i = i + 1;
    };
    do_payout(c, false, ctx);
}

fun do_payout<T>(c: &mut Circle<T>, auto: bool, ctx: &mut TxContext) {
    let round = c.round;
    assert!(round < c.members.length(), EFinished);
    assert!(!c.paid_out[round], EAlreadyPaidOut);
    let to = c.members[round];
    let value = c.pot.value();
    transfer::public_transfer(coin::from_balance(c.pot.withdraw_all(), ctx), to);
    *&mut c.paid_out[round] = true;
    let mut i = 0;
    while (i < c.paid.length()) {
        *&mut c.paid[i] = false;
        i = i + 1;
    };
    c.round = round + 1;
    event::emit(PaidOut {
        circle: object::id(c),
        to,
        round,
        amount: value,
        auto,
    });
}

public fun round<T>(c: &Circle<T>): u64 { c.round }
public fun amount<T>(c: &Circle<T>): u64 { c.amount }
public fun members<T>(c: &Circle<T>): vector<address> { *&c.members }
public fun paid<T>(c: &Circle<T>): vector<bool> { *&c.paid }
public fun pot_value<T>(c: &Circle<T>): u64 { c.pot.value() }
public fun is_finished<T>(c: &Circle<T>): bool { c.round >= c.members.length() }
public fun auto_payout<T>(c: &Circle<T>): bool { c.auto_payout }
public fun is_open<T>(c: &Circle<T>): bool { c.open }
public fun is_started<T>(c: &Circle<T>): bool { c.started }
public fun max_members<T>(c: &Circle<T>): u64 { c.max_members }
public fun creator<T>(c: &Circle<T>): address { c.creator }
