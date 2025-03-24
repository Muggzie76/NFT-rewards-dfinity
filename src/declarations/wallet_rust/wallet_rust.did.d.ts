import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface HolderInfo {
  'gg_count' : bigint,
  'daku_count' : bigint,
  'last_updated' : bigint,
  'total_count' : bigint,
}
export interface NFTProgress {
  'in_progress' : boolean,
  'count' : bigint,
  'last_updated' : bigint,
}
export interface _SERVICE {
  'get_all_holders' : ActorMethod<[], Array<[Principal, HolderInfo]>>,
  'get_all_nft_counts' : ActorMethod<[], Array<[Principal, NFTProgress]>>,
  'get_balance' : ActorMethod<[Principal], bigint>,
  'get_nft_count' : ActorMethod<[Principal], NFTProgress>,
  'update_all_holders' : ActorMethod<[], bigint>,
  'update_balance' : ActorMethod<[Principal, bigint], bigint>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
