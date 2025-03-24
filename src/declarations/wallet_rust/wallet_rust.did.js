export const idlFactory = ({ IDL }) => {
  const HolderInfo = IDL.Record({
    'gg_count' : IDL.Nat64,
    'daku_count' : IDL.Nat64,
    'last_updated' : IDL.Nat64,
    'total_count' : IDL.Nat64,
  });
  const NFTProgress = IDL.Record({
    'in_progress' : IDL.Bool,
    'count' : IDL.Nat64,
    'last_updated' : IDL.Nat64,
  });
  return IDL.Service({
    'get_all_holders' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, HolderInfo))],
        ['query'],
      ),
    'get_all_nft_counts' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, NFTProgress))],
        ['query'],
      ),
    'get_balance' : IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
    'get_nft_count' : IDL.Func([IDL.Principal], [NFTProgress], ['query']),
    'update_all_holders' : IDL.Func([], [IDL.Nat64], []),
    'update_balance' : IDL.Func([IDL.Principal, IDL.Nat64], [IDL.Nat64], []),
  });
};
export const init = ({ IDL }) => { return []; };
