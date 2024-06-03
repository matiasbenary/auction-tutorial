// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, AccountId, NearPromise, initialize, assert } from "near-sdk-js";

class Bid {
  bidder: AccountId;
  bid: bigint;
}

@NearBindgen({ requireInit: true })
class AuctionContract {
  highest_bid: Bid = { bidder: '', bid: BigInt(1) };
  auction_end_time: bigint = BigInt(0);
  auctioneer: string = "";
  auction_was_claimed: boolean = false;

  @initialize({ privateFunction: true })
  init({ end_time, auctioneer }: { end_time: bigint, auctioneer: string }) {
    this.auction_end_time = end_time;
    this.highest_bid = { bidder: near.currentAccountId(), bid: BigInt(1) };
    this.auctioneer = auctioneer;
  }

  @call({ payableFunction: true })
  bid(): NearPromise {
    // Assert the auction is still ongoing
    assert(this.auction_end_time > near.blockTimestamp(), "Auction has ended");

    // Current bid
    const bid = near.attachedDeposit();
    const bidder = near.predecessorAccountId();

    // Last bid
    const { bidder: lastBidder, bid: lastBid } = this.highest_bid;

    // Check if the deposit is higher than the current bid
    assert(bid > lastBid, "You must place a higher bid");

    // Update the highest bid
    this.highest_bid = { bidder, bid }; // Save the new bid

    // Transfer tokens back to the last bidder
    return NearPromise.new(lastBidder).transfer(lastBid);
  }

  @view({})
  get_highest_bid(): Bid {
    return this.highest_bid;
  }

  @view({})
  get_auction_end_time(): BigInt {
    return this.auction_end_time;
  }
  
  @call({})
  claim() {
    assert(near.predecessorAccountId() == this.auctioneer, "Only auctioneer can end the auction");
    assert(this.auction_end_time <= near.blockTimestamp(), "Auction has not ended yet");
    assert(!this.auction_was_claimed, "Auction has been claimed");

    this.auction_was_claimed = true;
    return NearPromise.new(this.auctioneer).transfer(this.highest_bid.bid);
  }
}