import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Stats {
  'last_payout_time' : bigint,
  'total_payouts_processed' : bigint,
  'total_payout_amount' : bigint,
  'total_registered_users' : bigint,
  'next_payout_time' : bigint,
  'is_processing' : boolean,
  'failed_transfers' : bigint,
}
export interface UserStats {
  'last_payout_time' : bigint,
  'nft_count' : bigint,
  'last_payout_amount' : bigint,
  'total_payouts_received' : bigint,
}
export interface _SERVICE {
  'get_all_user_stats' : ActorMethod<[], Array<[Principal, UserStats]>>,
  'get_stats' : ActorMethod<[], Stats>,
  'get_user_stats' : ActorMethod<[Principal], UserStats>,
  'processPayouts' : ActorMethod<[], undefined>,
  'register' : ActorMethod<[], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
