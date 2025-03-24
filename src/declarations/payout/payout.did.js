export const idlFactory = ({ IDL }) => {
  const UserStats = IDL.Record({
    'last_payout_time' : IDL.Int,
    'nft_count' : IDL.Nat64,
    'last_payout_amount' : IDL.Nat64,
    'total_payouts_received' : IDL.Nat64,
  });
  const Stats = IDL.Record({
    'last_payout_time' : IDL.Int,
    'total_payouts_processed' : IDL.Nat64,
    'total_payout_amount' : IDL.Nat64,
    'total_registered_users' : IDL.Nat64,
    'next_payout_time' : IDL.Int,
    'is_processing' : IDL.Bool,
    'failed_transfers' : IDL.Nat64,
  });
  return IDL.Service({
    'get_all_user_stats' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserStats))],
        ['query'],
      ),
    'get_stats' : IDL.Func([], [Stats], ['query']),
    'get_user_stats' : IDL.Func([IDL.Principal], [UserStats], ['query']),
    'processPayouts' : IDL.Func([], [], []),
    'register' : IDL.Func([], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
