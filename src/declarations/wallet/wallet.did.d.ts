import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'getBalance' : ActorMethod<[Principal], bigint>,
  'getNFTCount' : ActorMethod<[Principal], bigint>,
  'updateBalance' : ActorMethod<[Principal, bigint], undefined>,
  'updateNFTCount' : ActorMethod<[Principal], bigint>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
